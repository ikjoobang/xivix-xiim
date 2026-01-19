/**
 * XIVIX XIIM - Main Processing Pipeline
 * 10단계 이미지 처리 파이프라인 구현
 * 
 * 업데이트: 네이버 검색 API 통합 + Gemini 2.0 Flash
 * 흐름: 네이버 API -> Browserless -> Gemini -> Cloudinary
 */

import type { 
  Env, 
  XIIMRequest, 
  XIIMResponse, 
  PipelineContext, 
  PipelineStep,
  MaskingZone 
} from '../types';
import { generateRequestId, hashArrayBuffer, generateVariantSeed } from '../utils/hash';
import { 
  generateUniqueImageUrl, 
  uploadToCloudinary,
  generateVariationParams 
} from './cloudinary';
import { 
  analyzeImageWithGemini, 
  filterHighConfidenceZones, 
  DEFAULT_IMAGE_DIMENSIONS 
} from './gemini';
import { 
  captureScreenshot, 
  downloadImage
} from './browserless';
import { 
  searchInsuranceContent,
  selectRandomTarget,
  filterImageTargets,
  filterHighQualityImages,
  type SearchTarget
} from './naver';
import { 
  authenticateUser, 
  checkDailyUsage, 
  incrementDailyUsage,
  createImageLog, 
  updateImageLog, 
  checkHashDuplicate, 
  registerHash,
  getInsuranceCompanyByCode 
} from './database';

/**
 * 메인 파이프라인 실행
 */
export async function executePipeline(
  env: Env,
  request: XIIMRequest
): Promise<XIIMResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // 파이프라인 컨텍스트 초기화
  const context: PipelineContext = {
    request_id: requestId,
    user_id: request.request_info.user_id,
    current_step: 'request',
    start_time: startTime
  };
  
  try {
    // ============================================
    // Step 1: 요청 수신 (Request)
    // ============================================
    context.current_step = 'request';
    console.log(`[${requestId}] Step 1: 요청 수신 - 키워드: "${request.request_info.keyword}"`);
    
    // ============================================
    // Step 2: 인증 검증 (Auth)
    // ============================================
    context.current_step = 'auth';
    console.log(`[${requestId}] Step 2: 인증 검증 중...`);
    
    const authResult = await authenticateUser(env.DB, request.api_key);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(requestId, 'AUTH_FAILED', authResult.error || '인증 실패');
    }
    
    // 일일 사용량 체크
    const usage = await checkDailyUsage(env.DB, context.user_id);
    if (usage.remaining <= 0) {
      return createErrorResponse(requestId, 'RATE_LIMIT', `일일 한도 초과. 사용: ${usage.used}/${usage.limit}`);
    }
    
    // 초기 로그 생성
    await createImageLog(env.DB, {
      request_id: requestId,
      user_id: context.user_id,
      keyword: request.request_info.keyword,
      target_company: request.request_info.target_company,
      status: 'processing'
    });
    
    // ============================================
    // Step 3: 타겟팅 & 수집 (Naver API + Scraping)
    // ============================================
    context.current_step = 'scraping';
    console.log(`[${requestId}] Step 3: 네이버 API 검색 및 이미지 수집 중...`);
    
    let imageData: ArrayBuffer;
    let sourceUrl: string;
    let searchTargets: SearchTarget[] | undefined;
    
    if (request.request_info.source_url) {
      // 직접 제공된 URL 사용
      sourceUrl = request.request_info.source_url;
      console.log(`[${requestId}] - 직접 제공된 URL 사용: ${sourceUrl}`);
      
      const downloadResult = await downloadImage(sourceUrl);
      
      if (!downloadResult.success || !downloadResult.data) {
        await updateImageLog(env.DB, requestId, { 
          status: 'failed', 
          error_message: downloadResult.error 
        });
        return createErrorResponse(requestId, 'DOWNLOAD_FAILED', downloadResult.error || '이미지 다운로드 실패');
      }
      
      imageData = downloadResult.data;
    } else {
      // 네이버 검색 API로 타겟 확보
      console.log(`[${requestId}] - 네이버 검색 API 호출 중...`);
      
      const searchResult = await searchInsuranceContent(
        env.NAVER_CLIENT_ID,
        env.NAVER_CLIENT_SECRET,
        request.request_info.keyword,
        request.request_info.target_company
      );
      
      if (!searchResult.success || !searchResult.targets || searchResult.targets.length === 0) {
        console.log(`[${requestId}] - 네이버 검색 실패, Browserless 폴백으로 전환`);
        
        // 폴백: Browserless로 직접 스크래핑
        const searchUrl = `https://search.naver.com/search.naver?where=image&sm=tab_jum&query=${encodeURIComponent(request.request_info.keyword + ' 설계안')}`;
        
        const screenshotResult = await captureScreenshot(env.BROWSERLESS_API_KEY, {
          url: searchUrl,
          options: {
            fullPage: false,
            type: 'png',
            viewport: { width: 1920, height: 1080 }
          }
        });
        
        if (!screenshotResult.success || !screenshotResult.image_data) {
          await updateImageLog(env.DB, requestId, { 
            status: 'failed', 
            error_message: screenshotResult.error || searchResult.error 
          });
          return createErrorResponse(requestId, 'SCRAPING_FAILED', '이미지 수집 실패');
        }
        
        imageData = screenshotResult.image_data;
        sourceUrl = searchUrl;
      } else {
        searchTargets = searchResult.targets;
        console.log(`[${requestId}] - 네이버 검색 결과: ${searchTargets.length}개 타겟 발견`);
        
        // 이미지 타겟 우선 필터링
        let imageTargets = filterImageTargets(searchTargets);
        if (imageTargets.length > 0) {
          imageTargets = filterHighQualityImages(imageTargets);
        }
        
        // 랜덤 타겟 선택 (중복 방지를 위해 매번 다른 원본)
        const selectedTarget = imageTargets.length > 0 
          ? selectRandomTarget(imageTargets)
          : selectRandomTarget(searchTargets);
        
        sourceUrl = selectedTarget.url;
        console.log(`[${requestId}] - 선택된 타겟: ${selectedTarget.type} - ${sourceUrl}`);
        
        if (selectedTarget.type === 'image') {
          // 이미지 직접 다운로드
          const downloadResult = await downloadImage(sourceUrl);
          
          if (!downloadResult.success || !downloadResult.data) {
            // 이미지 다운로드 실패 시 스크린샷으로 폴백
            console.log(`[${requestId}] - 이미지 다운로드 실패, 스크린샷으로 전환`);
            const screenshotResult = await captureScreenshot(env.BROWSERLESS_API_KEY, {
              url: sourceUrl,
              options: { type: 'png', viewport: { width: 1920, height: 1080 } }
            });
            
            if (!screenshotResult.success || !screenshotResult.image_data) {
              await updateImageLog(env.DB, requestId, { 
                status: 'failed', 
                error_message: '이미지 수집 실패' 
              });
              return createErrorResponse(requestId, 'SCRAPING_FAILED', '이미지 수집 실패');
            }
            imageData = screenshotResult.image_data;
          } else {
            imageData = downloadResult.data;
          }
        } else {
          // 블로그 포스트인 경우 스크린샷
          const screenshotResult = await captureScreenshot(env.BROWSERLESS_API_KEY, {
            url: sourceUrl,
            options: {
              fullPage: true,
              type: 'png',
              viewport: { width: 1200, height: 800 }
            }
          });
          
          if (!screenshotResult.success || !screenshotResult.image_data) {
            await updateImageLog(env.DB, requestId, { 
              status: 'failed', 
              error_message: screenshotResult.error 
            });
            return createErrorResponse(requestId, 'SCRAPING_FAILED', '블로그 스크린샷 실패');
          }
          
          imageData = screenshotResult.image_data;
        }
      }
    }
    
    context.source_image_data = imageData;
    context.source_image_url = sourceUrl;
    
    // ============================================
    // Step 4: 원본 저장 (Raw Storage)
    // ============================================
    context.current_step = 'raw_storage';
    console.log(`[${requestId}] Step 4: 원본 이미지 저장 중... (R2 + Cloudinary)`);
    
    // 이미지 해시 생성
    const sourceHash = await hashArrayBuffer(imageData);
    context.source_hash = sourceHash;
    
    // 변주 시드 생성
    let variantSeed = await generateVariantSeed(context.user_id);
    context.variant_seed = variantSeed;
    
    // 해시 중복 체크 (동일 원본 + 동일 시드 조합 방지)
    const duplicateCheck = await checkHashDuplicate(env.DB, sourceHash, variantSeed);
    if (duplicateCheck.isDuplicate) {
      // 새로운 시드 재생성
      variantSeed = await generateVariantSeed(context.user_id + '_' + Date.now());
      context.variant_seed = variantSeed;
      console.log(`[${requestId}] - 중복 감지, 새 시드 생성: ${variantSeed}`);
    }
    
    // R2에 원본 저장 (24시간 후 자동 삭제 설정은 R2 Lifecycle로)
    const rawKey = `raw/${requestId}_${Date.now()}.png`;
    try {
      await env.R2_RAW.put(rawKey, imageData, {
        customMetadata: {
          request_id: requestId,
          user_id: context.user_id,
          source_hash: sourceHash,
          source_url: sourceUrl
        }
      });
    } catch (r2Error) {
      console.log(`[${requestId}] - R2 저장 스킵 (로컬 개발 환경)`);
    }
    
    // Cloudinary에 업로드 (Signed Upload)
    const uploadResult = await uploadToCloudinary(
      env.CLOUDINARY_CLOUD_NAME,
      env.CLOUDINARY_API_KEY,
      env.CLOUDINARY_API_SECRET,
      imageData,
      `${requestId}.png`,
      'xivix/raw'
    );
    
    if (!uploadResult.success || !uploadResult.public_id) {
      // Cloudinary 업로드 실패 시에도 계속 진행 (데모용)
      console.log(`[${requestId}] - Cloudinary 업로드 실패, 데모 모드로 계속`);
      context.cloudinary_public_id = `demo/${requestId}`;
    } else {
      context.cloudinary_public_id = uploadResult.public_id;
    }
    
    await updateImageLog(env.DB, requestId, {
      source_hash: sourceHash,
      variant_seed: variantSeed,
      raw_r2_key: rawKey,
      cloudinary_public_id: context.cloudinary_public_id
    });
    
    // ============================================
    // Step 5: AI 비전 분석 (Gemini 2.0 Flash)
    // ============================================
    context.current_step = 'ai_analysis';
    console.log(`[${requestId}] Step 5: Gemini 2.0 Flash로 이미지 분석 중...`);
    
    const imageDimensions = DEFAULT_IMAGE_DIMENSIONS;
    context.image_dimensions = imageDimensions;
    
    const analysisResult = await analyzeImageWithGemini(
      env.GEMINI_API_KEY,
      imageData,
      imageDimensions
    );
    
    let maskingZones: MaskingZone[];
    
    if (analysisResult.success && analysisResult.zones.length > 0) {
      maskingZones = filterHighConfidenceZones(analysisResult.zones, 0.5);
      console.log(`[${requestId}] - Gemini 분석 완료: ${maskingZones.length}개 마스킹 영역 감지`);
      
      if (analysisResult.insurance_info) {
        console.log(`[${requestId}] - 보험사 감지: ${analysisResult.insurance_info.company || '미확인'}`);
      }
    } else {
      // 기본 마스킹 영역 설정 (중앙부)
      console.log(`[${requestId}] - 마스킹 영역 미감지, 기본 마스킹 적용`);
      maskingZones = [{
        type: 'other',
        x: Math.round(imageDimensions.width * 0.15),
        y: Math.round(imageDimensions.height * 0.1),
        width: Math.round(imageDimensions.width * 0.7),
        height: Math.round(imageDimensions.height * 0.2),
        confidence: 0.5,
        description: '기본 상단 마스킹'
      }];
    }
    
    context.masking_zones = maskingZones;
    
    // ============================================
    // Step 6: 변주 변수 생성 (Variation)
    // ============================================
    context.current_step = 'variation';
    console.log(`[${requestId}] Step 6: 수학적 변주 파라미터 생성 중...`);
    
    const variationParams = generateVariationParams();
    context.variation_params = variationParams;
    console.log(`[${requestId}] - 회전: ${variationParams.rotation}°, 밝기: ${variationParams.brightness}, 크롭: ${variationParams.crop_scale}`);
    
    // ============================================
    // Step 7: 가공 (Masking) - Cloudinary URL 생성
    // ============================================
    context.current_step = 'masking';
    console.log(`[${requestId}] Step 7: Cloudinary URL 변환으로 마스킹 적용 중...`);
    
    const urlResult = await generateUniqueImageUrl(
      env.CLOUDINARY_CLOUD_NAME,
      context.cloudinary_public_id!,
      maskingZones,
      context.user_id
    );
    
    context.final_url = urlResult.url;
    
    // ============================================
    // Step 8: 최종 저장 (Final Storage)
    // ============================================
    context.current_step = 'final_storage';
    console.log(`[${requestId}] Step 8: 최종 URL 기록 중...`);
    
    // Cloudinary URL 기반이므로 실제 파일 저장은 하지 않음
    
    // ============================================
    // Step 9: 기록 (Logging)
    // ============================================
    context.current_step = 'logging';
    console.log(`[${requestId}] Step 9: D1 DB에 결과 기록 중...`);
    
    const processingTime = Date.now() - startTime;
    
    // 보험 유형 결정
    const company = await getInsuranceCompanyByCode(env.DB, request.request_info.target_company);
    const insuranceType = company?.category === 'LIFE' ? 'LIFE_19' : 'NON_LIFE_12';
    
    // 최종 로그 업데이트
    await updateImageLog(env.DB, requestId, {
      final_url: urlResult.url,
      masking_zones: JSON.stringify(maskingZones),
      masking_applied: JSON.stringify(maskingZones.map(z => z.type)),
      variation_params: JSON.stringify(variationParams),
      insurance_type: insuranceType,
      status: 'completed',
      processing_time_ms: processingTime,
      completed_at: new Date().toISOString()
    });
    
    // 해시 레지스트리에 등록 (중복 방지)
    await registerHash(env.DB, sourceHash, variantSeed, requestId);
    
    // 일일 사용량 증가
    await incrementDailyUsage(env.DB, context.user_id, true);
    
    // ============================================
    // Step 10: 응답 반환 (Response)
    // ============================================
    context.current_step = 'response';
    console.log(`[${requestId}] Step 10: 최종 응답 반환 (처리시간: ${processingTime}ms)`);
    
    return {
      status: 'success',
      data: {
        image_id: requestId,
        final_url: urlResult.url,
        metadata: {
          masking_applied: maskingZones.map(z => z.type),
          variant_seed: variantSeed,
          insurance_type: insuranceType,
          processing_time_ms: processingTime
        }
      },
      request_id: requestId
    };
    
  } catch (error) {
    console.error(`[${requestId}] 파이프라인 오류 (${context.current_step}):`, error);
    
    // 에러 로깅
    try {
      await updateImageLog(env.DB, requestId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await incrementDailyUsage(env.DB, context.user_id, false);
    } catch (logError) {
      console.error(`[${requestId}] 에러 로깅 실패:`, logError);
    }
    
    return createErrorResponse(
      requestId,
      'PIPELINE_ERROR',
      `파이프라인 오류 (${context.current_step}): ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      context.current_step
    );
  }
}

/**
 * 에러 응답 생성 헬퍼
 */
function createErrorResponse(
  requestId: string,
  code: string,
  message: string,
  details?: string
): XIIMResponse {
  return {
    status: 'error',
    error: {
      code,
      message,
      details
    },
    request_id: requestId
  };
}
