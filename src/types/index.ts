/**
 * XIVIX Image Intelligence Middleware (XIIM)
 * Type Definitions
 */

// ============================================
// Cloudflare Bindings
// ============================================
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Storage
  R2_RAW: R2Bucket;
  R2_FINAL: R2Bucket;
  
  // Environment Variables
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  
  // Secrets (wrangler secret put)
  XIVIX_API_KEY: string;
  GEMINI_API_KEY: string;
  BROWSERLESS_API_KEY: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  
  // 네이버 검색 API
  NAVER_CLIENT_ID: string;
  NAVER_CLIENT_SECRET: string;
}

// ============================================
// API Request/Response Types
// ============================================

/** 프론트엔드 -> 미들웨어 요청 */
export interface XIIMRequest {
  api_key: string;
  request_info: {
    keyword: string;                    // 검색 키워드 (예: "삼성생명 30대 여성 암보험 설계안")
    target_company: string;             // 대상 보험사 코드 (예: "SAMSUNG_LIFE")
    user_id: string;                    // 사용자 ID (예: "designer_01")
    variation_count?: number;           // 생성할 변주 개수 (기본: 1)
    source_url?: string;                // 직접 제공된 이미지 URL (스크래핑 건너뛰기)
  };
}

/** 미들웨어 -> 프론트엔드 응답 */
export interface XIIMResponse {
  status: 'success' | 'error' | 'processing';
  data?: {
    image_id: string;                   // 이미지 고유 ID
    final_url: string;                  // 최종 가공된 이미지 URL
    metadata: {
      masking_applied: string[];        // 적용된 마스킹 유형
      variant_seed: string;             // 변주 시드값
      insurance_type: string;           // 보험 유형 (LIFE_19, NON_LIFE_12)
      processing_time_ms: number;       // 처리 시간
    };
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  request_id: string;
}

// ============================================
// Gemini API Types
// ============================================

/** Gemini Vision 분석 요청 */
export interface GeminiAnalysisRequest {
  image_url: string;
  analysis_type: 'masking_detection' | 'content_analysis';
}

/** Gemini가 탐지한 마스킹 영역 */
export interface MaskingZone {
  type: 'name' | 'logo' | 'premium' | 'phone' | 'id_number' | 'address' | 'other';
  x: number;                            // 좌상단 X 좌표 (픽셀)
  y: number;                            // 좌상단 Y 좌표 (픽셀)
  width: number;                        // 너비 (픽셀)
  height: number;                       // 높이 (픽셀)
  confidence: number;                   // 신뢰도 (0-1)
  description?: string;                 // 탐지된 내용 설명
}

/** Gemini Vision 분석 응답 */
export interface GeminiAnalysisResponse {
  success: boolean;
  zones: MaskingZone[];
  image_dimensions: {
    width: number;
    height: number;
  };
  insurance_info?: {
    company: string;
    product_name?: string;
    coverage_type?: string;
  };
  error?: string;
}

// ============================================
// Cloudinary Types
// ============================================

/** Cloudinary 변형 파라미터 */
export interface CloudinaryTransformParams {
  // 미세 회전 (-3 ~ 3도)
  rotation: number;
  
  // 밝기 조절 (-10 ~ 10)
  brightness: number;
  
  // 대비 조절 (-10 ~ 10)
  contrast: number;
  
  // 크롭 비율 (0.7 ~ 0.9)
  crop_scale: number;
  
  // 크롭 중심점
  crop_gravity: 'center' | 'auto' | 'face';
  
  // 감마 조절 (0.9 ~ 1.1)
  gamma?: number;
}

/** Cloudinary 마스킹 파라미터 */
export interface CloudinaryMaskingParams {
  type: 'blur' | 'pixelate' | 'solid';
  intensity: number;                    // blur: 100-2000, pixelate: 5-50
  zones: MaskingZone[];
  overlay_color?: string;               // solid 타입용 색상 (예: "rgb:000000")
}

/** Cloudinary URL 생성 결과 */
export interface CloudinaryUrlResult {
  url: string;
  public_id: string;
  transform_string: string;
  variant_seed: string;
}

// ============================================
// Browserless Types
// ============================================

/** Browserless 스크린샷 요청 */
export interface BrowserlessScreenshotRequest {
  url: string;
  options?: {
    fullPage?: boolean;
    type?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    viewport?: {
      width: number;
      height: number;
    };
  };
}

/** Browserless 스크린샷 응답 */
export interface BrowserlessScreenshotResponse {
  success: boolean;
  image_data?: ArrayBuffer;
  error?: string;
}

// ============================================
// Database Models
// ============================================

export interface User {
  id: number;
  user_id: string;
  api_key_hash: string;
  company: string | null;
  tier: 'basic' | 'pro' | 'enterprise';
  daily_limit: number;
  created_at: string;
  updated_at: string;
}

export interface ImageLog {
  id: number;
  request_id: string;
  user_id: string;
  source_hash: string;
  variant_seed: string;
  keyword: string | null;
  target_company: string | null;
  insurance_type: string | null;
  raw_r2_key: string | null;
  final_r2_key: string | null;
  cloudinary_public_id: string | null;
  final_url: string | null;
  masking_zones: string | null;         // JSON string
  masking_applied: string | null;       // JSON string
  variation_params: string | null;      // JSON string
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface InsuranceCompany {
  id: number;
  code: string;
  name_ko: string;
  name_en: string | null;
  category: 'LIFE' | 'NON_LIFE';
  is_active: number;
  created_at: string;
}

// ============================================
// Pipeline Status Types
// ============================================

export type PipelineStep = 
  | 'request'           // Step 1: 요청 수신
  | 'auth'              // Step 2: 인증 검증
  | 'scraping'          // Step 3: 이미지 수집
  | 'raw_storage'       // Step 4: 원본 저장
  | 'ai_analysis'       // Step 5: AI 분석
  | 'variation'         // Step 6: 변주 파라미터 생성
  | 'masking'           // Step 7: 마스킹 적용
  | 'final_storage'     // Step 8: 최종 저장
  | 'logging'           // Step 9: 로깅
  | 'response';         // Step 10: 응답 반환

export interface PipelineContext {
  request_id: string;
  user_id: string;
  current_step: PipelineStep;
  start_time: number;
  
  // 수집된 데이터
  source_image_url?: string;
  source_image_data?: ArrayBuffer;
  source_hash?: string;
  
  // Cloudinary 데이터
  cloudinary_public_id?: string;
  
  // AI 분석 결과
  masking_zones?: MaskingZone[];
  image_dimensions?: { width: number; height: number };
  
  // 변주 파라미터
  variation_params?: CloudinaryTransformParams;
  variant_seed?: string;
  
  // 최종 결과
  final_url?: string;
  
  // 에러 정보
  error?: {
    step: PipelineStep;
    message: string;
    details?: string;
  };
}
