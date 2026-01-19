-- XIVIX Image Intelligence Middleware (XIIM) Database Schema
-- 사용 로그 및 해시 체크를 위한 D1 데이터베이스 스키마
-- 접두사 xiim_ 사용으로 기존 테이블과 충돌 방지

-- 1. API 사용자 테이블
CREATE TABLE IF NOT EXISTS xiim_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,           -- 설계사 고유 ID (예: designer_01)
  api_key_hash TEXT NOT NULL,              -- API 키 해시값
  company TEXT,                            -- 소속 회사
  tier TEXT DEFAULT 'basic',               -- 서비스 등급 (basic, pro, enterprise)
  daily_limit INTEGER DEFAULT 100,         -- 일일 요청 제한
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 이미지 처리 로그 테이블
CREATE TABLE IF NOT EXISTS xiim_image_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,         -- 요청 고유 ID (UUID)
  user_id TEXT NOT NULL,                   -- 요청한 사용자 ID
  source_hash TEXT NOT NULL,               -- 원본 이미지 해시 (중복 체크용)
  variant_seed TEXT NOT NULL,              -- 변주 시드값 (유니크 보장)
  keyword TEXT,                            -- 검색 키워드
  target_company TEXT,                     -- 대상 보험사 코드
  insurance_type TEXT,                     -- 보험 유형 (LIFE_19, NON_LIFE_12)
  
  -- 저장소 정보
  raw_r2_key TEXT,                         -- R2 raw/ 폴더 키
  final_r2_key TEXT,                       -- R2 final/ 폴더 키
  cloudinary_public_id TEXT,               -- Cloudinary 업로드 ID
  final_url TEXT,                          -- 최종 가공된 이미지 URL
  
  -- 마스킹 정보
  masking_zones TEXT,                      -- JSON: Gemini가 탐지한 좌표 배열
  masking_applied TEXT,                    -- JSON: 적용된 마스킹 유형 배열
  
  -- 변주 파라미터
  variation_params TEXT,                   -- JSON: 적용된 변주 파라미터
  
  -- 상태 및 타임스탬프
  status TEXT DEFAULT 'pending',           -- pending, processing, completed, failed
  error_message TEXT,                      -- 실패 시 에러 메시지
  processing_time_ms INTEGER,              -- 처리 소요 시간 (밀리초)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES xiim_users(user_id)
);

-- 3. 해시 중복 체크 테이블 (빠른 조회용)
CREATE TABLE IF NOT EXISTS xiim_hash_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  combined_hash TEXT UNIQUE NOT NULL,      -- Hash(source_hash + variant_seed)
  request_id TEXT NOT NULL,                -- 연관된 요청 ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (request_id) REFERENCES xiim_image_logs(request_id)
);

-- 4. 일일 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS xiim_daily_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,                      -- YYYY-MM-DD 형식
  request_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES xiim_users(user_id)
);

-- 5. 보험사 코드 테이블
CREATE TABLE IF NOT EXISTS xiim_insurance_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,               -- 보험사 코드 (예: SAMSUNG_LIFE)
  name_ko TEXT NOT NULL,                   -- 한글명
  name_en TEXT,                            -- 영문명
  category TEXT NOT NULL,                  -- LIFE (생명보험) / NON_LIFE (손해보험)
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_xiim_image_logs_user_id ON xiim_image_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_xiim_image_logs_source_hash ON xiim_image_logs(source_hash);
CREATE INDEX IF NOT EXISTS idx_xiim_image_logs_status ON xiim_image_logs(status);
CREATE INDEX IF NOT EXISTS idx_xiim_image_logs_created_at ON xiim_image_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_xiim_hash_registry_combined_hash ON xiim_hash_registry(combined_hash);
CREATE INDEX IF NOT EXISTS idx_xiim_daily_usage_user_date ON xiim_daily_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_xiim_insurance_companies_category ON xiim_insurance_companies(category);
