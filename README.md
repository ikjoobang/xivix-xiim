# XIVIX Image Intelligence Middleware (XIIM)

## 프로젝트 개요

**XIVIX XIIM**은 19개 생명보험사 및 12개 손해보험사의 실제 보장분석/설계안 이미지를 수집하고, AI(Gemini)를 통해 개인정보를 마스킹한 후, 수학적 변주를 적용하여 **수천 명의 설계사가 중복 없이 사용할 수 있는 유니크한 콘텐츠**를 생성하는 이미지 인텔리전스 미들웨어입니다.

### 핵심 목표
- ❶ 개인정보 보호: AI 기반 자동 마스킹 (이름, 로고, 금액, 연락처 등)
- ❷ 이미지 유니크성 보장: 수학적 변주 공식으로 동일 원본에서 중복 없는 이미지 생성
- ❸ 대규모 처리: 31개 보험사 대상 확장 가능한 아키텍처

## URLs

- **개발 미리보기**: https://3000-ijjehzvhnz90gmp5rfvyu-583b4d74.sandbox.novita.ai
- **Health Check**: https://3000-ijjehzvhnz90gmp5rfvyu-583b4d74.sandbox.novita.ai/api/health
- **프로덕션** (배포 후): https://xivix-middleware.pages.dev

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | Hono Framework + TypeScript |
| **Infrastructure** | Cloudflare Workers (Edge Runtime) |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 (raw/final) |
| **AI Engine** | Google Gemini 1.5 Flash (Vision) |
| **Image Transform** | Cloudinary (URL-based) |
| **Scraping** | Browserless.io (Playwright) |

## 10단계 처리 파이프라인

```
┌──────────────────────────────────────────────────────────────────┐
│  1. Request → 2. Auth → 3. Scraping → 4. Raw Storage            │
│       ↓                                                          │
│  5. AI Analysis (Gemini) → 6. Variation → 7. Masking            │
│       ↓                                                          │
│  8. Final Storage → 9. Logging → 10. Response                    │
└──────────────────────────────────────────────────────────────────┘
```

## 데이터 아키텍처

### D1 Database 스키마

| 테이블 | 용도 |
|--------|------|
| `users` | API 사용자 및 인증 정보 |
| `image_logs` | 이미지 처리 로그 (전체 파이프라인 추적) |
| `hash_registry` | 해시 중복 체크 (유니크성 보장) |
| `daily_usage` | 일일 사용량 추적 |
| `insurance_companies` | 31개 보험사 마스터 데이터 |

### R2 Storage 구조

```
xivix-raw/          # 원본 이미지 (24시간 자동 삭제)
  └── raw/{request_id}_{timestamp}.png

xivix-final/        # 최종 가공 이미지 (영구 보관)
  └── final/{request_id}_{variant_seed}.png
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

**응답 (성공)**:
```json
{
  "status": "success",
  "data": {
    "image_id": "vix_abc123def456",
    "final_url": "https://res.cloudinary.com/xivix/image/upload/a_2.5/e_brightness:10/...",
    "metadata": {
      "masking_applied": ["name", "logo", "premium"],
      "variant_seed": "s_99281abc",
      "insurance_type": "LIFE_19",
      "processing_time_ms": 2340
    }
  },
  "request_id": "vix_abc123def456"
}
```

### 기타 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/health` | 서비스 상태 확인 |
| GET | `/api/companies` | 보험사 목록 조회 |
| GET | `/api/companies?category=LIFE` | 생명보험사만 조회 |
| GET | `/api/status/:requestId` | 처리 상태 조회 |
| GET | `/api/usage` | 일일 사용량 조회 |
| POST | `/api/preview-transform` | 변주 URL 미리보기 |

## 수학적 변주 공식

모든 변주 파라미터는 **Seed(S) = Hash(User_ID + Timestamp)** 기반으로 결정됩니다.

```
f(Image, S) = J(P(C(R(I_raw, θ), k), P_coords), J_val)

여기서:
- R: 미세 회전 (θ = Random(-3.0, 3.0)도)
- C: 랜덤 크롭 (k = Random(0.7, 0.9))
- P: 원근 왜곡 (±1% 모서리 변형)
- J: 컬러 지터링 (Brightness ±10%, Contrast ±10%)
```

### Cloudinary URL 변환 예시

```
https://res.cloudinary.com/xivix/image/upload/
  a_2.5/                                    # 회전 2.5도
  e_brightness:10/                          # 밝기 +10
  c_crop,w_0.85,h_0.85,g_center/           # 85% 크롭
  e_blur_region:800,x_150,y_420,w_100,h_40/ # 이름 마스킹
  e_blur_region:800,x_50,y_50,w_200,h_80/   # 로고 마스킹
  raw_sample.png
```

## 로컬 개발

### 1. 환경 설정

```bash
# 프로젝트 클론
git clone https://github.com/your-org/xivix-xiim.git
cd xivix-xiim

# 의존성 설치
npm install

# 환경 변수 설정 (.dev.vars)
cp .dev.vars.example .dev.vars
# 각 API 키 입력
```

### 2. 데이터베이스 초기화

```bash
# 마이그레이션 실행
npm run db:migrate:local

# 테스트 데이터 시드
npm run db:seed

# DB 초기화 (필요시)
npm run db:reset
```

### 3. 개발 서버 실행

```bash
# 빌드
npm run build

# PM2로 서버 시작
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npm run dev:sandbox
```

### 4. 테스트

```bash
# Health Check
curl http://localhost:3000/api/health

# 보험사 목록
curl http://localhost:3000/api/companies

# 이미지 처리 테스트
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"api_key":"test_key","request_info":{"keyword":"삼성생명 설계안","target_company":"SAMSUNG_LIFE","user_id":"test"}}'
```

## 프로덕션 배포

### 1. Cloudflare 리소스 생성

```bash
# D1 데이터베이스 생성
npx wrangler d1 create XIIM_DB

# R2 버킷 생성
npx wrangler r2 bucket create xivix-raw
npx wrangler r2 bucket create xivix-final
```

### 2. Secrets 설정

```bash
npx wrangler pages secret put XIVIX_API_KEY --project-name xivix-middleware
npx wrangler pages secret put GEMINI_API_KEY --project-name xivix-middleware
npx wrangler pages secret put BROWSERLESS_API_KEY --project-name xivix-middleware
npx wrangler pages secret put CLOUDINARY_API_KEY --project-name xivix-middleware
npx wrangler pages secret put CLOUDINARY_API_SECRET --project-name xivix-middleware
```

### 3. 배포

```bash
# 프로덕션 배포
npm run deploy:prod

# 마이그레이션 (프로덕션)
npm run db:migrate:prod
```

## 보안 고려사항

- ❶ **API 키 검증**: 모든 요청은 API 키 해시 검증 필수
- ❷ **Rate Limiting**: 일일 사용량 제한 (tier별 차등)
- ❸ **개인정보 보호**: 마스킹 전 원본 이미지 외부 노출 금지
- ❹ **R2 Lifecycle**: raw/ 폴더 24시간 자동 삭제 설정

## 디렉토리 구조

```
xivix-xiim/
├── src/
│   ├── index.tsx              # 메인 앱 + 대시보드 UI
│   ├── types/
│   │   └── index.ts           # TypeScript 타입 정의
│   ├── routes/
│   │   └── api.ts             # API 라우트 핸들러
│   ├── services/
│   │   ├── pipeline.ts        # 10단계 파이프라인 로직
│   │   ├── cloudinary.ts      # URL 변환 서비스
│   │   ├── gemini.ts          # AI Vision 분석
│   │   ├── browserless.ts     # 웹 스크래핑
│   │   └── database.ts        # D1 CRUD 작업
│   └── utils/
│       └── hash.ts            # 해시 및 시드 생성
├── migrations/
│   └── 0001_initial_schema.sql
├── public/                    # 정적 파일
├── wrangler.jsonc             # Cloudflare 설정
├── ecosystem.config.cjs       # PM2 설정
├── .dev.vars                  # 로컬 환경 변수
└── package.json
```

## 지원 보험사 (31개)

### 생명보험사 (19개)
삼성생명, 한화생명, 교보생명, NH농협생명, 신한라이프, 미래에셋생명, KB생명, 흥국생명, 동양생명, ABL생명, 메트라이프, 푸르덴셜생명, AIA생명, DB생명, KDB생명, 처브라이프, 하나생명, IBK연금보험, 라이나생명

### 손해보험사 (12개)
삼성화재, 현대해상, DB손해보험, KB손해보험, 메리츠화재, 한화손해보험, 롯데손해보험, 흥국화재, MG손해보험, NH농협손해보험, AXA손해보험, 처브손해보험

## 다음 단계 (미구현)

- [ ] Cloudinary 실제 업로드 연동 (Unsigned Preset 설정 필요)
- [ ] Browserless.io 실제 스크래핑 테스트
- [ ] R2 Lifecycle Policy 설정 (24시간 자동 삭제)
- [ ] 관리자 대시보드 (통계, 모니터링)
- [ ] 프론트엔드 메인 웹(xivix-2026-pro) 연동

## 라이선스

XIVIX 2026 Project - Internal Use Only

---

**Last Updated**: 2026-01-19
