/**
 * XIVIX XIIM - Main Processing Pipeline
 * 10단계 이미지 처리 파이프라인 구현
 * 
 * 업데이트: 네이버 검색 API 통합 + Gemini 2.0 Flash
 * 흐름: 네이버 API -> Browserless -> Gemini -> Cloudinary
 * 
 * 성능 목표: 10초 이내 처리 완료
 * 최적화: 병렬 처리, 타임아웃, 캠싱
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
  DEFAULT_IMAGE_DIMENSIONS,
  verifyInsuranceImage,
  type ImageVerificationResult
} from './gemini';
import { 
  captureScreenshot, 
  downloadImage,
  validateImageData
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
import {
  getR2Sample,
  getCompanyNameKo,
  hasSampleForCompany,
  type InsuranceSample
} from './r2-fallback';

/**
 * 키워드에서 상품 유형 추출
 */
function extractProductType(keyword: string): string | undefined {
  const productPatterns: Record<string, string[]> = {
    '종신': ['종신', '종신보험', 'universal', 'whole'],
    '암': ['암', '암보험', 'cancer'],
    '어린이': ['어린이', '자녀', '아이', '태아', 'child', 'kids'],
    '운전자': ['운전자', '운전', 'driver'],
    '연금': ['연금', 'pension', 'annuity'],
    '건강': ['건강', 'health'],
    '상해': ['상해', 'injury'],
    '화재': ['화재', 'fire'],
    '실손': ['실손', '실비', 'real'],
    '치아': ['치아', 'dental']
  };
  
  const keywordLower = keyword.toLowerCase();
  
  for (const [productType, patterns] of Object.entries(productPatterns)) {
    for (const pattern of patterns) {
      if (keywordLower.includes(pattern.toLowerCase())) {
        return productType;
      }
    }
  }
  
  return undefined;
}

/**
 * R2 샘플 폴백 헬퍼 함수
 * 이미지 수집 실패 시 R2에서 표준 샘플을 가져옴
 */
async function tryR2Fallback(
  env: Env,
  targetCompany: string,
  keyword: string,
  requestId: string
): Promise<{ data: ArrayBuffer; sample: InsuranceSample } | null> {
  if (!hasSampleForCompany(targetCompany)) {
    console.log(`[${requestId}] - R2 샘플 미등록: ${targetCompany}`);
    return null;
  }
  
  const productKeyword = extractProductType(keyword);
  const r2Sample = await getR2Sample(env, targetCompany, productKeyword);
  
  if (r2Sample) {
    console.log(`[${requestId}] - ✅ R2 샘플 폴백 성공: ${r2Sample.sample.sample_key}`);
    return r2Sample;
  }
  
  console.log(`[${requestId}] - R2 샘플 로드 실패: ${targetCompany}`);
  return null;
}

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
          // ✅ 스크린샷 실패 시 R2 샘플로 자동 교체
          console.log(`[${requestId}] - 스크린샷 실패, R2 샘플로 교체 시도...`);
          const r2Fallback = await tryR2Fallback(env, request.request_info.target_company, request.request_info.keyword, requestId);
          if (r2Fallback) {
            imageData = r2Fallback.data;
            sourceUrl = `r2://samples/${r2Fallback.sample.sample_key}`;
          } else {
            await updateImageLog(env.DB, requestId, { status: 'failed', error_message: 'R2 샘플도 없음' });
            return createErrorResponse(requestId, 'SCRAPING_FAILED', '이미지 수집 실패. R2 샘플 업로드가 필요합니다.');
          }
        } else {
          // ✅ 스크린샷 이미지 유효성 검증
          const screenshotValidation = validateImageData(screenshotResult.image_data);
          if (!screenshotValidation.valid) {
            console.log(`[${requestId}] - 스크린샷 검증 실패 (${screenshotValidation.error}), R2 샘플로 교체...`);
            const r2Fallback = await tryR2Fallback(env, request.request_info.target_company, request.request_info.keyword, requestId);
            if (r2Fallback) {
              imageData = r2Fallback.data;
              sourceUrl = `r2://samples/${r2Fallback.sample.sample_key}`;
            } else {
              // R2도 없으면 그냥 진행 (경고만)
              console.log(`[${requestId}] - ⚠️ R2 없음, 원본 스크린샷으로 계속`);
              imageData = screenshotResult.image_data;
            }
          } else {
            imageData = screenshotResult.image_data;
          }
        }
        sourceUrl = sourceUrl || searchUrl;
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
            // ✅ 이미지 다운로드 실패 (HTML 페이지 등) 시 R2 샘플로 자동 교체
            console.log(`[${requestId}] - 이미지 다운로드 실패: ${downloadResult.error}`);
            console.log(`[${requestId}] - R2 샘플로 자동 교체 시도...`);
            
            const r2Fallback = await tryR2Fallback(env, request.request_info.target_company, request.request_info.keyword, requestId);
            if (r2Fallback) {
              imageData = r2Fallback.data;
              sourceUrl = `r2://samples/${r2Fallback.sample.sample_key}`;
            } else {
              // R2도 없으면 스크린샷 시도
              console.log(`[${requestId}] - R2 없음, 스크린샷으로 폴백...`);
              const screenshotResult = await captureScreenshot(env.BROWSERLESS_API_KEY, {
                url: sourceUrl,
                options: { type: 'png', viewport: { width: 1920, height: 1080 } }
              });
              
              if (screenshotResult.success && screenshotResult.image_data) {
                const validation = validateImageData(screenshotResult.image_data);
                if (validation.valid) {
                  imageData = screenshotResult.image_data;
                } else {
                  // 스크린샷도 실패 - 경고 후 계속 (임시)
                  console.log(`[${requestId}] - ⚠️ 모든 폴백 실패, R2 샘플 업로드 필요`);
                  await updateImageLog(env.DB, requestId, { status: 'failed', error_message: 'R2 샘플 필요' });
                  return createErrorResponse(requestId, 'INVALID_IMAGE', `이미지 수집 실패. ${request.request_info.target_company} R2 샘플 업로드가 필요합니다.`);
                }
              } else {
                await updateImageLog(env.DB, requestId, { status: 'failed', error_message: 'R2 샘플 필요' });
                return createErrorResponse(requestId, 'SCRAPING_FAILED', `이미지 수집 실패. ${request.request_info.target_company} R2 샘플 업로드가 필요합니다.`);
              }
            }
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
            // ✅ 블로그 스크린샷 실패 시 R2 샘플로 교체
            console.log(`[${requestId}] - 블로그 스크린샷 실패, R2 샘플로 교체 시도...`);
            const r2Fallback = await tryR2Fallback(env, request.request_info.target_company, request.request_info.keyword, requestId);
            if (r2Fallback) {
              imageData = r2Fallback.data;
              sourceUrl = `r2://samples/${r2Fallback.sample.sample_key}`;
            } else {
              await updateImageLog(env.DB, requestId, { status: 'failed', error_message: 'R2 샘플 필요' });
              return createErrorResponse(requestId, 'SCRAPING_FAILED', `블로그 스크린샷 실패. ${request.request_info.target_company} R2 샘플 업로드가 필요합니다.`);
            }
          } else {
            // ✅ 블로그 스크린샷 이미지 유효성 검증
            const blogScreenshotValidation = validateImageData(screenshotResult.image_data);
            if (!blogScreenshotValidation.valid) {
              console.log(`[${requestId}] - 블로그 스크린샷 검증 실패 (${blogScreenshotValidation.error}), R2 샘플로 교체...`);
              const r2Fallback = await tryR2Fallback(env, request.request_info.target_company, request.request_info.keyword, requestId);
              if (r2Fallback) {
                imageData = r2Fallback.data;
                sourceUrl = `r2://samples/${r2Fallback.sample.sample_key}`;
              } else {
                console.log(`[${requestId}] - ⚠️ R2 없음, 원본 스크린샷으로 계속`);
                imageData = screenshotResult.image_data;
              }
            } else {
              imageData = screenshotResult.image_data;
            }
          }
        }
      }
    }
    
    context.source_image_data = imageData;
    context.source_image_url = sourceUrl;
    
    // ============================================
    // Step 3.5: 이미지 검증 (Gemini AI Pre-verification)
    // ============================================
    console.log(`[${requestId}] Step 3.5: Gemini AI 이미지 검증 중...`);
    
    // source_url로 직접 제공된 경우 검증 건너뛰기
    const skipVerification = !!request.request_info.source_url;
    let useR2Fallback = false;
    let r2Sample: { data: ArrayBuffer; sample: InsuranceSample } | null = null;
    
    if (!skipVerification) {
      // 검증 대상 보험사 한글명 가져오기
      const targetCompanyKo = getCompanyNameKo(request.request_info.target_company);
      
      // Gemini 2.0 Flash로 빠른 검증 (0.5초 타임아웃)
      const verificationResult = await Promise.race([
        verifyInsuranceImage(env.GEMINI_API_KEY, imageData, targetCompanyKo),
        new Promise<ImageVerificationResult>((resolve) => 
          setTimeout(() => resolve({
            is_valid: false,
            detected_company: null,
            is_design_document: false,
            reason: '검증 타임아웃',
            confidence: 0
          }), 3000) // 3초 타임아웃 (검증에 시간 필요)
        )
      ]);
      
      console.log(`[${requestId}] - 검증 결과: ${verificationResult.is_valid ? '✅ 통과' : '❌ 실패'}`);
      console.log(`[${requestId}] - 감지된 보험사: ${verificationResult.detected_company || '미확인'}`);
      console.log(`[${requestId}] - 설계서 여부: ${verificationResult.is_design_document ? 'Yes' : 'No'}`);
      console.log(`[${requestId}] - 판단 근거: ${verificationResult.reason}`);
      
      // 검증 실패 시 R2 폴백 시도 (에러 대신 자동 교체)
      if (!verificationResult.is_valid) {
        console.log(`[${requestId}] - ❌ 검증 실패: ${verificationResult.reason}`);
        console.log(`[${requestId}] - 폴백 모드: R2 표준 샘플로 자동 교체 시도...`);
        
        // R2에서 해당 보험사 샘플 가져오기
        if (hasSampleForCompany(request.request_info.target_company)) {
          // 키워드에서 상품 유형 추출 시도
          const productKeyword = extractProductType(request.request_info.keyword);
          
          r2Sample = await getR2Sample(
            env,
            request.request_info.target_company,
            productKeyword
          );
          
          if (r2Sample) {
            console.log(`[${requestId}] - ✅ R2 샘플 폴백 성공: ${r2Sample.sample.sample_key}`);
            imageData = r2Sample.data;
            sourceUrl = `r2://samples/${r2Sample.sample.sample_key}`;
            useR2Fallback = true;
          } else {
            // R2 샘플이 없으면 경고만 남기고 원본 이미지로 계속 진행 (에러 X)
            console.log(`[${requestId}] - ⚠️ R2 샘플 미등록, 원본 이미지로 계속 진행 (AI 검증만 실패)`);
            console.log(`[${requestId}] - 샘플 업로드 필요: samples/life|nonlife/${request.request_info.target_company.toLowerCase()}/*.png`);
            // 광고 이미지라도 일단 가공 진행 (R2 업로드 전까지 임시 조치)
            useR2Fallback = false;
          }
        } else {
          // 해당 보험사 샘플 미등록 시도 경고만 남기고 계속 진행
          console.log(`[${requestId}] - ⚠️ ${request.request_info.target_company} 샘플 미등록, 원본 이미지로 계속 진행`);
          console.log(`[${requestId}] - 샘플 등록 필요: INSURANCE_SAMPLES['${request.request_info.target_company}']`);
          useR2Fallback = false;
        }
      }
      
      // 컨텍스트 업데이트
      context.source_image_data = imageData;
      context.source_image_url = sourceUrl;
    } else {
      console.log(`[${requestId}] - source_url 직접 제공됨, 검증 건너뛰기`);
    }
    
    // ============================================
    // Step 4-5: 원본 저장 + AI 분석 (병렬 처리로 성능 최적화)
    // ============================================
    context.current_step = 'raw_storage';
    console.log(`[${requestId}] Step 4-5: 원본 저장 + AI 분석 (병렬 처리)...${useR2Fallback ? ' [R2 폴백 모드]' : ''}`);
    
    // 해시 계산 (빠름)
    const sourceHash = await hashArrayBuffer(imageData);
    context.source_hash = sourceHash;
    
    // 변주 시드 생성
    let variantSeed = await generateVariantSeed(context.user_id);
    context.variant_seed = variantSeed;
    
    // 해시 중복 체크 (동일 원본 + 동일 시드 조합 방지)
    const duplicateCheck = await checkHashDuplicate(env.DB, sourceHash, variantSeed);
    if (duplicateCheck.isDuplicate) {
      // 새로운 시드 재생성 (최대 3회 시도)
      for (let i = 0; i < 3; i++) {
        variantSeed = await generateVariantSeed(context.user_id + '_' + Date.now() + '_' + i);
        const recheck = await checkHashDuplicate(env.DB, sourceHash, variantSeed);
        if (!recheck.isDuplicate) break;
      }
      context.variant_seed = variantSeed;
      console.log(`[${requestId}] - 중복 감지, 새 시드 생성: ${variantSeed}`);
    }
    
    const rawKey = `raw/${requestId}_${Date.now()}.png`;
    const imageDimensions = DEFAULT_IMAGE_DIMENSIONS;
    context.image_dimensions = imageDimensions;
    
    // 병렬 처리: R2 저장 + Cloudinary 업로드 + Gemini 분석
    const [r2Result, uploadResult, analysisResult] = await Promise.allSettled([
      // R2 저장 (24시간 후 자동 삭제 설정은 R2 Lifecycle로)
      (async () => {
        try {
          await env.R2_RAW.put(rawKey, imageData, {
            customMetadata: {
              request_id: requestId,
              user_id: context.user_id,
              source_hash: sourceHash,
              source_url: sourceUrl
            }
          });
          return { success: true };
        } catch (err) {
          console.log(`[${requestId}] - R2 저장 스킵`);
          return { success: false };
        }
      })(),
      
      // Cloudinary 업로드
      uploadToCloudinary(
        env.CLOUDINARY_CLOUD_NAME,
        env.CLOUDINARY_API_KEY,
        env.CLOUDINARY_API_SECRET,
        imageData,
        `${requestId}.png`,
        'xivix/raw'
      ),
      
      // Gemini AI 분석 (타임아웃 8초)
      Promise.race([
        analyzeImageWithGemini(env.GEMINI_API_KEY, imageData, imageDimensions),
        new Promise<{ success: false; zones: []; error: string }>((_, reject) => 
          setTimeout(() => reject({ success: false, zones: [], error: 'AI 분석 타임아웃 (8s)' }), 8000)
        )
      ])
    ]);
    
    // Cloudinary 결과 처리
    const cloudinaryResult = uploadResult.status === 'fulfilled' ? uploadResult.value : null;
    if (!cloudinaryResult?.success || !cloudinaryResult?.public_id) {
      // Cloudinary 업로드 실패 시 에러 반환 (demo/ 경로 404 방지)
      const uploadError = cloudinaryResult?.error || 'Cloudinary 업로드 실패';
      console.error(`[${requestId}] - ❌ Cloudinary 업로드 실패: ${uploadError}`);
      await updateImageLog(env.DB, requestId, { 
        status: 'failed', 
        error_message: uploadError
      });
      return createErrorResponse(
        requestId, 
        'UPLOAD_FAILED', 
        `이미지 업로드 실패: ${uploadError}. 잠시 후 다시 시도해주세요.`
      );
    }
    context.cloudinary_public_id = cloudinaryResult.public_id;
    console.log(`[${requestId}] - ✅ Cloudinary 업로드 성공: ${cloudinaryResult.public_id}`);
    
    // DB 로그 업데이트 (비동기)
    updateImageLog(env.DB, requestId, {
      source_hash: sourceHash,
      variant_seed: variantSeed,
      raw_r2_key: rawKey,
      cloudinary_public_id: context.cloudinary_public_id
    }).catch(err => console.error(`[${requestId}] DB 업데이트 실패:`, err));
    
    // AI 분석 결과 처리
    context.current_step = 'ai_analysis';
    
    let maskingZones: MaskingZone[];
    const geminiResult = analysisResult.status === 'fulfilled' ? analysisResult.value : null;
    
    if (geminiResult?.success && geminiResult.zones.length > 0) {
      maskingZones = filterHighConfidenceZones(geminiResult.zones, 0.5);
      console.log(`[${requestId}] - Gemini 분석 완료: ${maskingZones.length}개 마스킹 영역 감지`);
      
      if (geminiResult.insurance_info) {
        console.log(`[${requestId}] - 보험사 감지: ${geminiResult.insurance_info.company || '미확인'}`);
      }
    } else {
      // 기본 마스킹 영역 설정 (중앙부 - 성명/로고/보험료/연락처 영역)
      console.log(`[${requestId}] - 마스킹 영역 미감지 또는 타임아웃, 기본 마스킹 적용`);
      maskingZones = [
        // 상단 영역 (로고, 성명)
        {
          type: 'name',
          x: Math.round(imageDimensions.width * 0.05),
          y: Math.round(imageDimensions.height * 0.02),
          width: Math.round(imageDimensions.width * 0.3),
          height: Math.round(imageDimensions.height * 0.05),
          confidence: 0.5,
          description: '기본 상단 좌측 마스킹'
        },
        {
          type: 'logo',
          x: Math.round(imageDimensions.width * 0.7),
          y: Math.round(imageDimensions.height * 0.02),
          width: Math.round(imageDimensions.width * 0.25),
          height: Math.round(imageDimensions.height * 0.08),
          confidence: 0.5,
          description: '기본 상단 우측 로고 마스킹'
        },
        // 하단 영역 (연락처, 설계사 정보)
        {
          type: 'phone',
          x: Math.round(imageDimensions.width * 0.05),
          y: Math.round(imageDimensions.height * 0.9),
          width: Math.round(imageDimensions.width * 0.4),
          height: Math.round(imageDimensions.height * 0.08),
          confidence: 0.5,
          description: '기본 하단 연락처 마스킹'
        }
      ];
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
