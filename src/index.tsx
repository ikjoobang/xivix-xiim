/**
 * XIVIX Image Intelligence Middleware (XIIM)
 * Main Application Entry Point
 * 
 * 19개 생명보험사 + 12개 손해보험사의 보장분석/설계안 이미지를
 * AI(Gemini)로 분석하고 수학적 변주를 적용하여
 * 수천 명의 설계사가 중복 없이 사용할 수 있는 유니크 콘텐츠를 생성합니다.
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Env } from './types';
import api from './routes/api';

const app = new Hono<{ Bindings: Env }>();

// 로깅 미들웨어
app.use('*', logger());

// API 라우트 마운트
app.route('/api', api);

// 메인 대시보드 페이지 (한글)
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XIVIX 이미지 인텔리전스 미들웨어 (XIIM)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
      body { font-family: 'Noto Sans KR', sans-serif; }
      .gradient-bg {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      }
      .card-hover {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }
      .pulse-dot {
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .loading-spinner {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
</head>
<body class="gradient-bg min-h-screen text-white">
    <!-- 헤더 -->
    <header class="border-b border-gray-700/50 backdrop-blur-sm bg-black/20">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <i class="fas fa-brain text-xl"></i>
          </div>
          <div>
            <h1 class="text-xl font-bold">XIVIX XIIM</h1>
            <p class="text-xs text-gray-400">이미지 인텔리전스 미들웨어</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="pulse-dot w-2 h-2 bg-green-400 rounded-full"></span>
          <span class="text-sm text-gray-400">시스템 정상 운영중</span>
        </div>
      </div>
    </header>

    <!-- 메인 콘텐츠 -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- 통계 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">등록 보험사</span>
            <i class="fas fa-building text-blue-400"></i>
          </div>
          <div class="text-3xl font-bold">31개사</div>
          <div class="text-sm text-gray-500 mt-1">생명 19 + 손해 12</div>
        </div>
        
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">파이프라인 단계</span>
            <i class="fas fa-stream text-purple-400"></i>
          </div>
          <div class="text-3xl font-bold">10단계</div>
          <div class="text-sm text-gray-500 mt-1">요청 → 응답</div>
        </div>
        
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">AI 분석 엔진</span>
            <i class="fas fa-robot text-green-400"></i>
          </div>
          <div class="text-3xl font-bold">Gemini</div>
          <div class="text-sm text-gray-500 mt-1">2.0 Flash Vision</div>
        </div>
        
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">이미지 변환</span>
            <i class="fas fa-magic text-yellow-400"></i>
          </div>
          <div class="text-3xl font-bold">Cloudinary</div>
          <div class="text-sm text-gray-500 mt-1">URL 기반 변환</div>
        </div>
      </div>

      <!-- 파이프라인 다이어그램 -->
      <div class="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 mb-8">
        <h2 class="text-xl font-semibold mb-6 flex items-center">
          <i class="fas fa-project-diagram mr-3 text-blue-400"></i>
          이미지 처리 파이프라인
        </h2>
        <div class="overflow-x-auto">
          <div class="flex items-center justify-start md:justify-between gap-4 min-w-max md:min-w-0 py-4">
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500/50">
                <i class="fas fa-paper-plane text-blue-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">1. 요청<br/>수신</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center border-2 border-purple-500/50">
                <i class="fas fa-key text-purple-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">2. 인증<br/>검증</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
                <i class="fas fa-search text-green-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">3. 이미지<br/>수집</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center border-2 border-yellow-500/50">
                <i class="fas fa-database text-yellow-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">4. 원본<br/>저장</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-pink-500/20 rounded-full flex items-center justify-center border-2 border-pink-500/50">
                <i class="fas fa-brain text-pink-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">5. AI<br/>분석</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center border-2 border-indigo-500/50">
                <i class="fas fa-random text-indigo-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">6. 수학적<br/>변주</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
                <i class="fas fa-mask text-red-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">7. 마스킹<br/>적용</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-cyan-500/20 rounded-full flex items-center justify-center border-2 border-cyan-500/50">
                <i class="fas fa-cloud-upload-alt text-cyan-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">8. 최종<br/>저장</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center border-2 border-orange-500/50">
                <i class="fas fa-clipboard-list text-orange-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">9. 로그<br/>기록</span>
            </div>
            <i class="fas fa-chevron-right text-gray-600"></i>
            
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/50">
                <i class="fas fa-check-circle text-emerald-400"></i>
              </div>
              <span class="text-xs mt-2 text-gray-400 text-center">10. 응답<br/>반환</span>
            </div>
          </div>
        </div>
      </div>

      <!-- API 테스트 섹션 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- 요청 폼 -->
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-xl font-semibold mb-6 flex items-center">
            <i class="fas fa-terminal mr-3 text-green-400"></i>
            API 테스트 콘솔
          </h2>
          
          <form id="testForm" class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">API 키</label>
              <input type="password" id="apiKey" placeholder="API 키를 입력하세요" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">사용자 ID</label>
              <input type="text" id="userId" value="designer_01" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">검색 키워드</label>
              <input type="text" id="keyword" placeholder="예: 삼성생명 30대 여성 암보험 설계안" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">대상 보험사</label>
              <select id="targetCompany" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none">
                <option value="">보험사 선택</option>
                <optgroup label="생명보험사 (19개사)">
                  <option value="SAMSUNG_LIFE">삼성생명</option>
                  <option value="HANWHA_LIFE">한화생명</option>
                  <option value="KYOBO_LIFE">교보생명</option>
                  <option value="NH_LIFE">NH농협생명</option>
                  <option value="SHINHAN_LIFE">신한라이프</option>
                  <option value="MIRAE_LIFE">미래에셋생명</option>
                  <option value="KB_LIFE">KB라이프생명</option>
                  <option value="AIA">AIA생명</option>
                  <option value="METLIFE">메트라이프생명</option>
                  <option value="PRUDENTIAL">푸르덴셜생명</option>
                  <option value="LINA">라이나생명</option>
                  <option value="DB_LIFE">DB생명</option>
                  <option value="DONGYANG_LIFE">동양생명</option>
                  <option value="ABL_LIFE">ABL생명</option>
                  <option value="CHUBB_LIFE">처브라이프생명</option>
                  <option value="KDB_LIFE">KDB생명</option>
                  <option value="IBK_LIFE">IBK연금보험</option>
                  <option value="HANA_LIFE">하나생명</option>
                  <option value="HEUNGKUK_LIFE">흥국생명</option>
                </optgroup>
                <optgroup label="손해보험사 (12개사)">
                  <option value="SAMSUNG_FIRE">삼성화재</option>
                  <option value="HYUNDAI_MARINE">현대해상</option>
                  <option value="DB_INSURANCE">DB손해보험</option>
                  <option value="KB_INSURANCE">KB손해보험</option>
                  <option value="MERITZ_FIRE">메리츠화재</option>
                  <option value="HANWHA_GENERAL">한화손해보험</option>
                  <option value="NH_INSURANCE">NH농협손해보험</option>
                  <option value="LOTTE_INSURANCE">롯데손해보험</option>
                  <option value="MG_INSURANCE">MG손해보험</option>
                  <option value="HEUNGKUK_FIRE">흥국화재</option>
                  <option value="AXA_GENERAL">AXA손해보험</option>
                  <option value="CHUBB_GENERAL">처브손해보험</option>
                </optgroup>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">원본 이미지 URL (선택사항)</label>
              <input type="url" id="sourceUrl" placeholder="https://example.com/image.png" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none">
              <p class="text-xs text-gray-500 mt-1">직접 이미지 URL을 입력하면 네이버 검색을 건너뜁니다</p>
            </div>
            
            <button type="submit" id="submitBtn"
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2">
              <i class="fas fa-play" id="submitIcon"></i>
              <span id="submitText">파이프라인 실행</span>
            </button>
          </form>
        </div>
        
        <!-- 응답 패널 -->
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-xl font-semibold mb-6 flex items-center">
            <i class="fas fa-code mr-3 text-purple-400"></i>
            응답 결과
          </h2>
          
          <div id="responsePanel" class="bg-gray-900/50 rounded-lg p-4 min-h-[300px] font-mono text-sm overflow-auto">
            <pre id="responseContent" class="text-gray-400 whitespace-pre-wrap">// 응답이 여기에 표시됩니다...</pre>
          </div>
          
          <div id="resultImage" class="mt-4 hidden">
            <h3 class="text-sm text-gray-400 mb-2">생성된 이미지 미리보기:</h3>
            <a id="imageLink" href="#" target="_blank" class="block">
              <img id="previewImage" src="" alt="생성된 이미지" class="rounded-lg border border-gray-700 max-w-full hover:opacity-90 transition-opacity cursor-pointer">
            </a>
            <p class="text-xs text-gray-500 mt-2">이미지를 클릭하면 새 탭에서 열립니다</p>
          </div>
          
          <div id="maskingInfo" class="mt-4 hidden">
            <h3 class="text-sm text-gray-400 mb-2">마스킹 정보:</h3>
            <div id="maskingTags" class="flex flex-wrap gap-2"></div>
          </div>
        </div>
      </div>

      <!-- 수학적 변주 공식 설명 -->
      <div class="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 mt-8">
        <h2 class="text-xl font-semibold mb-6 flex items-center">
          <i class="fas fa-calculator mr-3 text-cyan-400"></i>
          수학적 변주 공식
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div class="bg-gray-900/50 rounded-lg p-4 text-center">
            <div class="text-2xl mb-2">🔄</div>
            <div class="text-sm font-semibold text-white">회전</div>
            <div class="text-xs text-gray-400 mt-1">-3° ~ +3°</div>
            <div class="text-xs text-blue-400">미세 회전</div>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4 text-center">
            <div class="text-2xl mb-2">✂️</div>
            <div class="text-sm font-semibold text-white">크롭</div>
            <div class="text-xs text-gray-400 mt-1">70% ~ 90%</div>
            <div class="text-xs text-blue-400">랜덤 자르기</div>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4 text-center">
            <div class="text-2xl mb-2">☀️</div>
            <div class="text-sm font-semibold text-white">밝기</div>
            <div class="text-xs text-gray-400 mt-1">-10 ~ +10</div>
            <div class="text-xs text-blue-400">명도 조절</div>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4 text-center">
            <div class="text-2xl mb-2">🎨</div>
            <div class="text-sm font-semibold text-white">대비</div>
            <div class="text-xs text-gray-400 mt-1">-10 ~ +10</div>
            <div class="text-xs text-blue-400">콘트라스트</div>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4 text-center">
            <div class="text-2xl mb-2">🌈</div>
            <div class="text-sm font-semibold text-white">감마</div>
            <div class="text-xs text-gray-400 mt-1">0.9 ~ 1.1</div>
            <div class="text-xs text-blue-400">색상 보정</div>
          </div>
        </div>
        
        <div class="mt-6 p-4 bg-gray-900/50 rounded-lg">
          <p class="text-sm text-gray-400">
            <strong class="text-white">목적:</strong> 사람 눈에는 동일해 보이되, 
            <span class="text-yellow-400">해시 기반 디지털 핑거프린트가 겹치지 않도록</span> 하여 
            네이버/유튜브에서 중복 이미지로 인식되지 않게 합니다.
          </p>
        </div>
      </div>

      <!-- API 문서 -->
      <div class="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 mt-8">
        <h2 class="text-xl font-semibold mb-6 flex items-center">
          <i class="fas fa-book mr-3 text-yellow-400"></i>
          API 레퍼런스
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-green-500 text-xs px-2 py-1 rounded mr-3 font-semibold">POST</span>
              <code class="text-blue-400">/api/process</code>
            </div>
            <p class="text-sm text-gray-400">메인 이미지 처리 엔드포인트</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/status/:requestId</code>
            </div>
            <p class="text-sm text-gray-400">처리 상태 확인</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/usage</code>
            </div>
            <p class="text-sm text-gray-400">일일 API 사용량 조회</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/companies</code>
            </div>
            <p class="text-sm text-gray-400">보험사 목록 조회 (31개사)</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/health</code>
            </div>
            <p class="text-sm text-gray-400">시스템 상태 확인</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/test-naver?keyword=...</code>
            </div>
            <p class="text-sm text-gray-400">네이버 검색 API 테스트</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 푸터 -->
    <footer class="border-t border-gray-700/50 mt-12 py-6">
      <div class="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
        <p>XIVIX 2026 프로젝트 &copy; 이미지 인텔리전스 미들웨어</p>
        <p class="mt-1">Cloudflare Workers + Gemini AI + Cloudinary 기반</p>
      </div>
    </footer>

    <script>
      // 마스킹 타입 한글 매핑
      const maskingTypeKr = {
        'name': '이름',
        'logo': '로고',
        'premium': '보험료',
        'phone': '연락처',
        'id_number': '주민번호',
        'address': '주소',
        'other': '기타'
      };
      
      // 마스킹 타입별 색상
      const maskingColors = {
        'name': 'bg-red-500',
        'logo': 'bg-blue-500',
        'premium': 'bg-green-500',
        'phone': 'bg-yellow-500',
        'id_number': 'bg-purple-500',
        'address': 'bg-pink-500',
        'other': 'bg-gray-500'
      };

      document.getElementById('testForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const submitIcon = document.getElementById('submitIcon');
        const submitText = document.getElementById('submitText');
        const responseContent = document.getElementById('responseContent');
        const resultImage = document.getElementById('resultImage');
        const previewImage = document.getElementById('previewImage');
        const imageLink = document.getElementById('imageLink');
        const maskingInfo = document.getElementById('maskingInfo');
        const maskingTags = document.getElementById('maskingTags');
        
        // 로딩 상태
        submitBtn.disabled = true;
        submitIcon.className = 'fas fa-spinner loading-spinner';
        submitText.textContent = '처리 중...';
        
        responseContent.textContent = '// 이미지 처리 중입니다. 잠시만 기다려주세요...';
        responseContent.className = 'text-yellow-400 whitespace-pre-wrap';
        resultImage.classList.add('hidden');
        maskingInfo.classList.add('hidden');
        
        const payload = {
          api_key: document.getElementById('apiKey').value,
          request_info: {
            keyword: document.getElementById('keyword').value,
            target_company: document.getElementById('targetCompany').value,
            user_id: document.getElementById('userId').value,
            variation_count: 1
          }
        };
        
        const sourceUrl = document.getElementById('sourceUrl').value;
        if (sourceUrl) {
          payload.request_info.source_url = sourceUrl;
        }
        
        try {
          const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          const data = await response.json();
          
          responseContent.textContent = JSON.stringify(data, null, 2);
          responseContent.className = data.status === 'success' ? 'text-green-400 whitespace-pre-wrap' : 'text-red-400 whitespace-pre-wrap';
          
          if (data.status === 'success' && data.data?.final_url) {
            previewImage.src = data.data.final_url;
            imageLink.href = data.data.final_url;
            resultImage.classList.remove('hidden');
            
            // 마스킹 정보 표시
            if (data.data.metadata?.masking_applied) {
              maskingTags.innerHTML = '';
              const counts = {};
              data.data.metadata.masking_applied.forEach(type => {
                counts[type] = (counts[type] || 0) + 1;
              });
              
              Object.entries(counts).forEach(([type, count]) => {
                const tag = document.createElement('span');
                tag.className = \`\${maskingColors[type] || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded\`;
                tag.textContent = \`\${maskingTypeKr[type] || type} (\${count})\`;
                maskingTags.appendChild(tag);
              });
              
              maskingInfo.classList.remove('hidden');
            }
          }
        } catch (error) {
          responseContent.textContent = JSON.stringify({ error: error.message }, null, 2);
          responseContent.className = 'text-red-400 whitespace-pre-wrap';
        } finally {
          // 버튼 상태 복원
          submitBtn.disabled = false;
          submitIcon.className = 'fas fa-play';
          submitText.textContent = '파이프라인 실행';
        }
      });
      
      // 페이지 로드 시 보험사 목록 확인
      fetch('/api/companies')
        .then(res => res.json())
        .then(data => {
          console.log('보험사 목록 로드 완료:', data.count + '개사');
        })
        .catch(err => console.error('보험사 목록 로드 실패:', err));
    </script>
</body>
</html>
  `);
});

// 404 핸들러
app.notFound((c) => {
  return c.json({
    error: '찾을 수 없음',
    message: '요청하신 엔드포인트가 존재하지 않습니다',
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/process',
      'GET /api/status/:requestId',
      'GET /api/usage',
      'GET /api/companies'
    ]
  }, 404);
});

// 에러 핸들러
app.onError((err, c) => {
  console.error('애플리케이션 오류:', err);
  return c.json({
    error: '서버 내부 오류',
    message: err.message
  }, 500);
});

export default app;
