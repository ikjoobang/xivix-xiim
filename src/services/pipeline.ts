/**
 * XIVIX XIIM - Main Processing Pipeline
 * 10단계 이미지 처리 파이프라인 구현
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
  generateDefaultMaskingUrl, 
  uploadToCloudinary,
  generateVariationParams 
} from './cloudinary';
import { 
  analyzeImageWithGemini, 
  filterHighConfidenceZones, 
  DEFAULT_IMAGE_DIMENSIONS 
} from './gemini';
import { 
  buildNaverImageSearchUrl, 
  captureScreenshot, 
  downloadImage, 
  optimizeSearchKeyword 
} from './browserless';
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
    console.log(`[${requestId}] Step 1: Request received`);
    
    // ============================================
    // Step 2: 인증 검증 (Auth)
    // ============================================
    context.current_step = 'auth';
    console.log(`[${requestId}] Step 2: Authenticating...`);
    
    const authResult = await authenticateUser(env.DB, request.api_key);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(requestId, 'AUTH_FAILED', authResult.error || 'Authentication failed');
    }
    
    // 일일 사용량 체크
    const usage = await checkDailyUsage(env.DB, context.user_id);
    if (usage.remaining <= 0) {
      return createErrorResponse(requestId, 'RATE_LIMIT', `Daily limit exceeded. Used: ${usage.used}/${usage.limit}`);
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
    // Step 3: 이미지 수집 (Scraping)
    // ============================================
    context.current_step = 'scraping';
    console.log(`[${requestId}] Step 3: Collecting image...`);
    
    let imageData: ArrayBuffer;
    let sourceUrl: string;
    
    if (request.request_info.source_url) {
      // 직접 제공된 URL 사용
      sourceUrl = request.request_info.source_url;
      const downloadResult = await downloadImage(sourceUrl);
      
      if (!downloadResult.success || !downloadResult.data) {
        await updateImageLog(env.DB, requestId, { 
          status: 'failed', 
          error_message: downloadResult.error 
        });
        return createErrorResponse(requestId, 'DOWNLOAD_FAILED', downloadResult.error || 'Failed to download source image');
      }
      
      imageData = downloadResult.data;
    } else {
      // Browserless로 스크래핑
      const optimizedKeyword = optimizeSearchKeyword(
        request.request_info.keyword,
        request.request_info.target_company
      );
      const searchUrl = buildNaverImageSearchUrl(optimizedKeyword);
      
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
          error_message: screenshotResult.error 
        });
        return createErrorResponse(requestId, 'SCRAPING_FAILED', screenshotResult.error || 'Failed to capture screenshot');
      }
      
      imageData = screenshotResult.image_data;
      sourceUrl = searchUrl;
    }
    
    context.source_image_data = imageData;
    context.source_image_url = sourceUrl;
    
    // ============================================
    // Step 4: 원본 저장 (Raw Storage)
    // ============================================
    context.current_step = 'raw_storage';
    console.log(`[${requestId}] Step 4: Storing raw image...`);
    
    // 이미지 해시 생성
    const sourceHash = await hashArrayBuffer(imageData);
    context.source_hash = sourceHash;
    
    // 변주 시드 생성
    const variantSeed = await generateVariantSeed(context.user_id);
    context.variant_seed = variantSeed;
    
    // 해시 중복 체크 (동일 원본 + 동일 시드 조합 방지)
    const duplicateCheck = await checkHashDuplicate(env.DB, sourceHash, variantSeed);
    if (duplicateCheck.isDuplicate) {
      // 새로운 시드 재생성
      context.variant_seed = await generateVariantSeed(context.user_id + '_retry');
    }
    
    // R2에 원본 저장 (24시간 후 자동 삭제 설정은 R2 Lifecycle로)
    const rawKey = `raw/${requestId}_${Date.now()}.png`;
    await env.R2_RAW.put(rawKey, imageData, {
      customMetadata: {
        request_id: requestId,
        user_id: context.user_id,
        source_hash: sourceHash
      }
    });
    
    // Cloudinary에 업로드
    const uploadResult = await uploadToCloudinary(
      env.CLOUDINARY_CLOUD_NAME,
      env.CLOUDINARY_UPLOAD_PRESET,
      imageData,
      `${requestId}.png`,
      'xivix/raw'
    );
    
    if (!uploadResult.success || !uploadResult.public_id) {
      await updateImageLog(env.DB, requestId, { 
        status: 'failed', 
        error_message: uploadResult.error 
      });
      return createErrorResponse(requestId, 'UPLOAD_FAILED', uploadResult.error || 'Failed to upload to Cloudinary');
    }
    
    context.cloudinary_public_id = uploadResult.public_id;
    
    await updateImageLog(env.DB, requestId, {
      source_hash: sourceHash,
      variant_seed: variantSeed,
      raw_r2_key: rawKey,
      cloudinary_public_id: uploadResult.public_id
    });
    
    // ============================================
    // Step 5: AI 분석 (AI Vision)
    // ============================================
    context.current_step = 'ai_analysis';
    console.log(`[${requestId}] Step 5: Analyzing with Gemini...`);
    
    // 이미지 크기 추정 (실제로는 이미지 메타데이터에서 추출해야 함)
    const imageDimensions = DEFAULT_IMAGE_DIMENSIONS;
    context.image_dimensions = imageDimensions;
    
    const analysisResult = await analyzeImageWithGemini(
      env.GEMINI_API_KEY,
      imageData,
      imageDimensions
    );
    
    let maskingZones: MaskingZone[];
    
    if (analysisResult.success && analysisResult.zones.length > 0) {
      // 신뢰도 높은 존만 필터링
      maskingZones = filterHighConfidenceZones(analysisResult.zones, 0.6);
    } else {
      // 기본 마스킹 영역 설정 (중앙부)
      console.log(`[${requestId}] No zones detected, using default masking`);
      maskingZones = [{
        type: 'other',
        x: imageDimensions.width * 0.2,
        y: imageDimensions.height * 0.2,
        width: imageDimensions.width * 0.6,
        height: imageDimensions.height * 0.6,
        confidence: 0.5,
        description: 'Default central masking'
      }];
    }
    
    context.masking_zones = maskingZones;
    
    // ============================================
    // Step 6: 변주 파라미터 생성 (Variation)
    // ============================================
    context.current_step = 'variation';
    console.log(`[${requestId}] Step 6: Generating variation parameters...`);
    
    const variationParams = generateVariationParams();
    context.variation_params = variationParams;
    
    // ============================================
    // Step 7: 마스킹 적용 (Masking) - Cloudinary URL 생성
    // ============================================
    context.current_step = 'masking';
    console.log(`[${requestId}] Step 7: Applying masking via Cloudinary URL...`);
    
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
    console.log(`[${requestId}] Step 8: Recording final URL...`);
    
    // Cloudinary URL 기반이므로 실제 파일 저장은 하지 않음
    // 필요시 final URL을 fetch하여 R2에 백업 가능
    
    // ============================================
    // Step 9: 로깅 (Logging)
    // ============================================
    context.current_step = 'logging';
    console.log(`[${requestId}] Step 9: Logging results...`);
    
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
    
    // 해시 레지스트리에 등록
    await registerHash(env.DB, sourceHash, variantSeed, requestId);
    
    // 일일 사용량 증가
    await incrementDailyUsage(env.DB, context.user_id, true);
    
    // ============================================
    // Step 10: 응답 반환 (Response)
    // ============================================
    context.current_step = 'response';
    console.log(`[${requestId}] Step 10: Sending response... (${processingTime}ms)`);
    
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
    console.error(`[${requestId}] Pipeline error at ${context.current_step}:`, error);
    
    // 에러 로깅
    await updateImageLog(env.DB, requestId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // 실패 카운트 증가
    await incrementDailyUsage(env.DB, context.user_id, false);
    
    return createErrorResponse(
      requestId,
      'PIPELINE_ERROR',
      `Pipeline failed at step ${context.current_step}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
