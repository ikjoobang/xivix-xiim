# XIVIX Image Intelligence Middleware (XIIM)

## 프로젝트 개요
- **Name**: XIVIX XIIM
- **Goal**: 19개 생명보험사 + 12개 손해보험사의 실제 보장분석/설계안 이미지를 수집하고, AI(Gemini 2.0 Flash)로 개인정보를 마스킹한 후 수학적 변주를 적용해 수천 명의 설계사가 중복 없이 사용할 수 있는 유니크한 콘텐츠 생성
- **Features**: 
  - 네이버 검색 API 기반 이미지/블로그 타겟팅
  - Browserless.io 실시간 화면 캡처
  - Gemini 2.0 Flash Vision 좌표 추출
  - Cloudinary URL 기반 수학적 변주/마스킹
  - 해시 기반 중복 방지

## 프로덕션 URL
- **메인 URL**: https://xivix-xiim.pages.dev
- **Health Check**: https://xivix-xiim.pages.dev/api/health
- **보험사 목록**: https://xivix-xiim.pages.dev/api/companies

## API 엔드포인트

### 1. Health Check
```
GET /api/health
```
서비스 상태 확인

### 2. 이미지 처리 요청
```
POST /api/process
Content-Type: application/json

{
  "api_key": "your_api_key",
  "request_info": {
    "keyword": "삼성생명 30대 여성 암보험 설계안",
    "target_company": "SAMSUNG_LIFE",
    "user_id": "designer_01",
    "variation_count": 1,
    "source_url": "https://example.com/image.jpg" // 옵션
  }
}
```

### 3. 처리 상태 조회
```
GET /api/status/:requestId
Header: X-API-Key: your_api_key
```

### 4. 일일 사용량 조회
```
GET /api/usage
Header: X-API-Key: your_api_key
```

### 5. 보험사 목록
```
GET /api/companies
GET /api/companies?category=LIFE
GET /api/companies?category=NON_LIFE
```

### 6. 테스트 엔드포인트
```
GET /api/test-naver?keyword=삼성생명+설계안
POST /api/test-gemini (enterprise tier only)
GET /api/test-pipeline?image_url=...
```

## 10단계 파이프라인

| 단계 | 설명 | 서비스 |
|------|------|--------|
| 1 | 요청 (Request) | Frontend → Workers |
| 2 | 타겟팅 (Naver API) | 네이버 검색 API |
| 3 | 수집 (Scraping) | Browserless.io |
| 4 | 원본 저장 (Raw) | Cloudflare R2 |
| 5 | 분석 (AI Vision) | Gemini 2.0 Flash |
| 6 | 변주 (Variation) | Math functions |
| 7 | 가공 (Masking) | Cloudinary URL |
| 8 | 최종 저장 (Final) | Cloudflare R2 |
| 9 | 기록 (Logging) | Cloudflare D1 |
| 10 | 반환 (Response) | JSON Response |

## 수학적 변주 공식

```
I_unique = f(Image, Seed)

where Seed = Hash(User_ID + Timestamp)

Parameters:
- 회전 (Rotation): θ ∈ [-3.0, 3.0]도
- 크롭 (Crop): k ∈ [0.7, 0.9] 비율
- 밝기 (Brightness): ±10
- 대비 (Contrast): ±10
- 감마 (Gamma): ±0.1
```

### Cloudinary URL 예시
```
https://res.cloudinary.com/df8yybjcg/image/upload/
  a_2.5/                           # 회전
  e_brightness:8/                   # 밝기
  e_contrast:-5/                    # 대비
  e_gamma:10/                       # 감마
  c_crop,w_0.85,h_0.85,g_center/   # 크롭
  e_pixelate_region:15,x_100,y_200,w_150,h_50/  # 마스킹
  sample.png
```

## 데이터 아키텍처

### 데이터베이스 테이블 (D1)
- `xiim_users`: API 사용자 정보
- `xiim_image_logs`: 이미지 처리 로그
- `xiim_hash_registry`: 해시 중복 체크
- `xiim_daily_usage`: 일일 사용량 추적
- `xiim_insurance_companies`: 31개 보험사 정보

### 스토리지 (R2)
- `xivix-raw`: 원본 이미지 저장 (24시간 자동 삭제)
- `xivix-final`: 가공 완료 이미지 저장

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Hono + TypeScript |
| Infrastructure | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| AI Vision | Google Gemini 2.0 Flash |
| Image Processing | Cloudinary URL Transformation |
| Web Scraping | Browserless.io |
| Search | Naver Search API |

## 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx              # 메인 앱 + 대시보드 UI
│   ├── types/index.ts         # TypeScript 타입 정의
│   ├── routes/api.ts          # API 라우트 핸들러
│   ├── services/
│   │   ├── pipeline.ts        # 10단계 파이프라인 핵심 로직
│   │   ├── cloudinary.ts      # URL 기반 이미지 변환 + 텍스트 오버레이
│   │   ├── gemini.ts          # AI Vision 좌표 추출
│   │   ├── naver.ts           # 네이버 검색 API
│   │   ├── browserless.ts     # 웹 스크래핑
│   │   ├── database.ts        # D1 CRUD 작업
│   │   └── r2-fallback.ts     # 시각적 맥락 동기화 R2 샘플 폴백
│   └── utils/hash.ts          # 해시/시드 생성
├── migrations/                 # D1 스키마
├── public/static/             # 정적 파일
├── wrangler.jsonc             # Cloudflare 설정
├── ecosystem.config.cjs       # PM2 설정 (개발용)
└── .dev.vars                  # 로컬 환경변수 (Git 제외)
```

## 시각적 맥락 동기화 (Visual Relevance) 전략

### 핵심 기능
질문의 상품군(암, 종신, 운전자 등)에 최적화된 샘플을 자동 선택하는 지능형 폴백 시스템

### R2 샘플 경로 구조
```
samples/
├── life/                      # 생명보험 (19개사)
│   ├── samsung/
│   │   ├── universal.png      # 기본 종합
│   │   ├── cancer.png         # 암보험
│   │   ├── whole_life.png     # 종신보험
│   │   ├── pension.png        # 연금보험
│   │   └── child.png          # 어린이보험
│   ├── hanwha/
│   ├── kyobo/
│   └── ...
└── nonlife/                   # 손해보험 (12개사)
    ├── samsung/
    │   ├── universal.png      # 기본 종합
    │   ├── driver.png         # 운전자보험
    │   ├── child.png          # 어린이보험
    │   ├── health.png         # 건강보험
    │   └── accident.png       # 상해보험
    ├── hyundai/
    ├── db/
    └── ...
```

### 카테고리 매핑
| 키워드 | 카테고리 코드 | 우선순위 |
|--------|---------------|----------|
| 암, 뇌, 심장, 3대질병 | cancer | 1 |
| 종신, 사망, 상속 | whole_life | 1 |
| 어린이, 자녀, 태아 | child | 1 |
| 운전자, 12대중과실 | driver | 1 |
| 연금, 저축, 노후 | pension | 1 |
| 건강, 실손 | health | 1 |
| 상해 | accident | 1 |
| 화재 | fire | 1 |
| 치아 | dental | 1 |

### Fallback 우선순위
1. **1순위**: `{company}_{category}.png` (질문과 상품까지 일치)
2. **2순위**: `{company}_universal.png` (보험사만 일치)

### 동적 텍스트 오버레이 (Context Overlay)
R2 폴백 사용 시, 이미지에 컨텍스트 텍스트를 자동 합성:
- 예: "삼성생명 종신보험 맞춤 설계안"
- 위치: 좌측 상단
- 스타일: 반투명 배경 + 흰색 텍스트

## 배포 상태

- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Last Updated**: 2026-01-19
- **Version**: v1.1.0 (Visual Relevance)
- **Commit**: 9a1eaa7
- **Secrets Configured**: 7개 (GEMINI_API_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, BROWSERLESS_API_KEY, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, XIVIX_API_KEY)

## 로컬 개발

```bash
# 의존성 설치
npm install

# 로컬 DB 마이그레이션
npm run db:migrate:local

# 시드 데이터 적용
npm run db:seed

# 개발 서버 시작
npm run build && pm2 start ecosystem.config.cjs

# 프로덕션 배포
npm run deploy:prod
```

## 환경변수 (.dev.vars)

```
XIVIX_API_KEY=your_api_key
GEMINI_API_KEY=your_gemini_key
NAVER_CLIENT_ID=your_naver_id
NAVER_CLIENT_SECRET=your_naver_secret
BROWSERLESS_API_KEY=your_browserless_key
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

## 보안 주의사항

- ⚠️ 마스킹 완료 전 수집 데이터 외부 노출 금지
- ⚠️ API 키는 환경변수로만 관리 (하드코딩 금지)
- ⚠️ HTTP Referrer 제한: `*.xivix.kr/*`, `*.xivix-xiim.pages.dev/*`
- ⚠️ R2 raw 데이터는 24시간 후 자동 삭제 설정
