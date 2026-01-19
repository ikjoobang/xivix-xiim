# XIVIX Image Intelligence Middleware (XIIM)

## 프로젝트 개요

**XIVIX XIIM**은 19개 생명보험사 및 12개 손해보험사의 실제 보장분석/설계안 이미지를 **네이버 검색 API**로 타겟팅하고, **Gemini 2.0 Flash**로 분석하여 개인정보를 마스킹한 후, **수학적 변주**를 적용하여 **수천 명의 설계사가 중복 없이 사용할 수 있는 유니크한 콘텐츠**를 생성하는 이미지 전용 엔진입니다.

### 핵심 목표
- ❶ **이미지 전용 엔진**: 텍스트 생성 기능 배제, 이미지 수집-분석-가공-배포에 집중
- ❷ **개인정보 보호**: AI 기반 자동 마스킹 (이름, 로고, 금액, 연락처 등)
- ❸ **이미지 유니크성 보장**: 동일 원본에서도 해시값이 겹치지 않는 변주 생성

## URLs

- **개발 서버**: https://3000-ijjehzvhnz90gmp5rfvyu-583b4d74.sandbox.novita.ai
- **Health API**: /api/health
- **네이버 검색 테스트**: /api/test-naver?keyword=삼성생명+설계안
- **Gemini 테스트**: POST /api/test-gemini

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | Hono Framework + TypeScript |
| **Infrastructure** | Cloudflare Workers (Edge Runtime) |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 (raw/final) |
| **타겟팅** | 네이버 검색 API (이미지/블로그) |
| **AI 분석** | Google Gemini 2.0 Flash (Vision) |
| **이미지 변환** | Cloudinary (URL-based Transformation) |
| **스크래핑** | Browserless.io (Playwright) |

## 10단계 처리 파이프라인

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. 이미지 요청 → 2. 인증 검증 → 3. 타겟팅 (네이버 API)            │
│       ↓                                                              │
│  4. 수집 (Browserless) → 5. 원본 저장 (R2)                          │
│       ↓                                                              │
│  6. AI 비전 분석 (Gemini 2.0 Flash) → 7. 변주 변수 생성             │
│       ↓                                                              │
│  8. 가공 (Cloudinary URL) → 9. 기록 (D1 DB) → 10. URL 배포          │
└─────────────────────────────────────────────────────────────────────┘
```

### 네이버 API 통합 상세

```javascript
// Step 3: 네이버 API를 이용한 타겟팅
const searchResult = await searchInsuranceContent(
  NAVER_CLIENT_ID,
  NAVER_CLIENT_SECRET,
  "40대 암보험 설계안"
);
// 결과: 상위 노출된 블로그/이미지 원본 URL 리스트 확보

// 랜덤 타겟 선택 (중복 방지)
const targetUrl = selectRandomTarget(searchResult.targets);
// -> Browserless로 전달하여 실시간 캡처
```

## API 명세

### 메인 처리 엔드포인트

**POST /api/process**

```json
{
  "api_key": "YOUR_API_KEY",
  "request_info": {
    "keyword": "삼성생명 30대 여성 암보험 설계안",
    "target_company": "SAMSUNG_LIFE",
    "user_id": "designer_01",
    "variation_count": 1,
    "source_url": "https://example.com/image.png"  // optional
  }
}
```

### 테스트 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/test-naver?keyword=...` | 네이버 검색 API 테스트 |
| POST | `/api/test-gemini` | Gemini 2.0 Flash 분석 테스트 |
| GET | `/api/test-pipeline?image_url=...` | 전체 파이프라인 테스트 |
| GET | `/api/companies` | 31개 보험사 목록 |

## 수학적 변주 공식

모든 변주 파라미터는 **Seed(S) = Hash(User_ID + Timestamp)** 기반으로 결정됩니다.

```
I_unique = Rotation(±3°) + Crop(70%~90%) + Brightness(±10) + Blur(Coordinates)
```

### Cloudinary URL 변환 예시

```
https://res.cloudinary.com/xivix/image/upload/
  a_2.5/                                    # 회전 2.5도
  e_brightness:10/                          # 밝기 +10
  c_crop,w_0.85,h_0.85,g_center/           # 85% 크롭
  e_blur_region:800,x_150,y_420,w_100,h_40/ # 이름 마스킹
  source.png
```

## 환경 변수 설정

`.dev.vars` 파일 (로컬 개발용):

```env
# API 인증
XIVIX_API_KEY=dev_test_api_key_12345

# Google Gemini 2.0 Flash
GEMINI_API_KEY=AIzaSy...

# 네이버 검색 API
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# Browserless.io
BROWSERLESS_API_KEY=your_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=xivix
CLOUDINARY_UPLOAD_PRESET=xivix_unsigned
```

## 로컬 개발

```bash
# 의존성 설치
npm install

# 데이터베이스 초기화
npm run db:migrate:local
npm run db:seed

# 빌드
npm run build

# 개발 서버 시작
pm2 start ecosystem.config.cjs

# 테스트
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/test-naver?keyword=삼성생명+설계안"
```

## 프로덕션 배포

```bash
# Cloudflare 리소스 생성
npx wrangler d1 create XIIM_DB
npx wrangler r2 bucket create xivix-raw
npx wrangler r2 bucket create xivix-final

# Secrets 설정
npx wrangler pages secret put GEMINI_API_KEY --project-name xivix-middleware
npx wrangler pages secret put NAVER_CLIENT_ID --project-name xivix-middleware
npx wrangler pages secret put NAVER_CLIENT_SECRET --project-name xivix-middleware

# 배포
npm run deploy:prod
```

## 디렉토리 구조

```
xivix-xiim/
├── src/
│   ├── index.tsx              # 메인 앱 + 대시보드
│   ├── types/index.ts         # TypeScript 타입
│   ├── routes/api.ts          # API 라우트
│   └── services/
│       ├── pipeline.ts        # 10단계 파이프라인
│       ├── naver.ts           # 네이버 검색 API
│       ├── gemini.ts          # Gemini 2.0 Flash
│       ├── cloudinary.ts      # URL 변환
│       ├── browserless.ts     # 웹 스크래핑
│       └── database.ts        # D1 CRUD
├── migrations/                 # D1 스키마
├── wrangler.jsonc             # Cloudflare 설정
└── .dev.vars                  # 로컬 환경변수
```

## 지원 보험사 (31개)

### 생명보험사 (19개)
삼성생명, 한화생명, 교보생명, NH농협생명, 신한라이프, 미래에셋생명, KB생명, 흥국생명, 동양생명, ABL생명, 메트라이프, 푸르덴셜생명, AIA생명, DB생명, KDB생명, 처브라이프, 하나생명, IBK연금보험, 라이나생명

### 손해보험사 (12개)
삼성화재, 현대해상, DB손해보험, KB손해보험, 메리츠화재, 한화손해보험, 롯데손해보험, 흥국화재, MG손해보험, NH농협손해보험, AXA손해보험, 처브손해보험

## 보안 설정

- **HTTP Referrer 제한**: `*.insurance-content-master.pages.dev/*`, `*.xivix.kr/*`
- **API 키 검증**: 모든 요청에 해시 기반 인증
- **R2 Lifecycle**: raw/ 폴더 24시간 자동 삭제

---

**XIVIX 2026 Project** - Image Intelligence Middleware
**Last Updated**: 2026-01-19
