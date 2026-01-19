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

// 메인 대시보드 페이지
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XIVIX Image Intelligence Middleware (XIIM)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; }
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
    </style>
</head>
<body class="gradient-bg min-h-screen text-white">
    <!-- Header -->
    <header class="border-b border-gray-700/50 backdrop-blur-sm bg-black/20">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <i class="fas fa-brain text-xl"></i>
          </div>
          <div>
            <h1 class="text-xl font-bold">XIVIX XIIM</h1>
            <p class="text-xs text-gray-400">Image Intelligence Middleware</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="pulse-dot w-2 h-2 bg-green-400 rounded-full"></span>
          <span class="text-sm text-gray-400">System Online</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">Total Companies</span>
            <i class="fas fa-building text-blue-400"></i>
          </div>
          <div class="text-3xl font-bold">31</div>
          <div class="text-sm text-gray-500 mt-1">19 Life + 12 Non-Life</div>
        </div>
        
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">Pipeline Steps</span>
            <i class="fas fa-stream text-purple-400"></i>
          </div>
          <div class="text-3xl font-bold">10</div>
          <div class="text-sm text-gray-500 mt-1">Request → Response</div>
        </div>
        
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">AI Engine</span>
            <i class="fas fa-robot text-green-400"></i>
          </div>
          <div class="text-3xl font-bold">Gemini</div>
          <div class="text-sm text-gray-500 mt-1">1.5 Flash Vision</div>
        </div>
        
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 card-hover">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm">Transform Engine</span>
            <i class="fas fa-magic text-yellow-400"></i>
          </div>
          <div class="text-3xl font-bold">Cloudinary</div>
          <div class="text-sm text-gray-500 mt-1">URL-based Transforms</div>
        </div>
      </div>

      <!-- Pipeline Diagram -->
      <div class="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 mb-8">
        <h2 class="text-xl font-semibold mb-6 flex items-center">
          <i class="fas fa-project-diagram mr-3 text-blue-400"></i>
          Processing Pipeline
        </h2>
        <div class="flex flex-wrap items-center justify-between gap-4">
          ${[
            { step: 1, name: 'Request', icon: 'fa-paper-plane', color: 'blue' },
            { step: 2, name: 'Auth', icon: 'fa-key', color: 'purple' },
            { step: 3, name: 'Scraping', icon: 'fa-spider', color: 'green' },
            { step: 4, name: 'Raw Storage', icon: 'fa-database', color: 'yellow' },
            { step: 5, name: 'AI Analysis', icon: 'fa-brain', color: 'pink' },
            { step: 6, name: 'Variation', icon: 'fa-random', color: 'indigo' },
            { step: 7, name: 'Masking', icon: 'fa-mask', color: 'red' },
            { step: 8, name: 'Final Storage', icon: 'fa-cloud-upload-alt', color: 'cyan' },
            { step: 9, name: 'Logging', icon: 'fa-clipboard-list', color: 'orange' },
            { step: 10, name: 'Response', icon: 'fa-check-circle', color: 'green' }
          ].map((item, index) => `
            <div class="flex items-center">
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 bg-${item.color}-500/20 rounded-full flex items-center justify-center border-2 border-${item.color}-500/50">
                  <i class="fas ${item.icon} text-${item.color}-400"></i>
                </div>
                <span class="text-xs mt-2 text-gray-400">${item.step}. ${item.name}</span>
              </div>
              ${index < 9 ? '<i class="fas fa-chevron-right mx-2 text-gray-600"></i>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- API Test Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Request Form -->
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-xl font-semibold mb-6 flex items-center">
            <i class="fas fa-terminal mr-3 text-green-400"></i>
            API Test Console
          </h2>
          
          <form id="testForm" class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">API Key</label>
              <input type="password" id="apiKey" placeholder="Enter your API key" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">User ID</label>
              <input type="text" id="userId" value="designer_01" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">Search Keyword</label>
              <input type="text" id="keyword" placeholder="예: 삼성생명 30대 여성 암보험 설계안" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">Target Company</label>
              <select id="targetCompany" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none">
                <option value="">Select Company</option>
                <optgroup label="생명보험사 (19)">
                  <option value="SAMSUNG_LIFE">삼성생명</option>
                  <option value="HANWHA_LIFE">한화생명</option>
                  <option value="KYOBO_LIFE">교보생명</option>
                  <option value="NH_LIFE">NH농협생명</option>
                  <option value="SHINHAN_LIFE">신한라이프</option>
                </optgroup>
                <optgroup label="손해보험사 (12)">
                  <option value="SAMSUNG_FIRE">삼성화재</option>
                  <option value="HYUNDAI_MARINE">현대해상</option>
                  <option value="DB_INSURANCE">DB손해보험</option>
                  <option value="KB_INSURANCE">KB손해보험</option>
                  <option value="MERITZ_FIRE">메리츠화재</option>
                </optgroup>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">Source Image URL (Optional)</label>
              <input type="url" id="sourceUrl" placeholder="https://example.com/image.png" 
                class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none">
            </div>
            
            <button type="submit" 
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2">
              <i class="fas fa-play"></i>
              <span>Execute Pipeline</span>
            </button>
          </form>
        </div>
        
        <!-- Response Panel -->
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-xl font-semibold mb-6 flex items-center">
            <i class="fas fa-code mr-3 text-purple-400"></i>
            Response
          </h2>
          
          <div id="responsePanel" class="bg-gray-900/50 rounded-lg p-4 min-h-[400px] font-mono text-sm overflow-auto">
            <pre id="responseContent" class="text-gray-400">// Response will appear here...</pre>
          </div>
          
          <div id="resultImage" class="mt-4 hidden">
            <h3 class="text-sm text-gray-400 mb-2">Generated Image Preview:</h3>
            <img id="previewImage" src="" alt="Generated Image" class="rounded-lg border border-gray-700 max-w-full">
          </div>
        </div>
      </div>

      <!-- API Documentation -->
      <div class="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 mt-8">
        <h2 class="text-xl font-semibold mb-6 flex items-center">
          <i class="fas fa-book mr-3 text-yellow-400"></i>
          Quick API Reference
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-green-500 text-xs px-2 py-1 rounded mr-3 font-semibold">POST</span>
              <code class="text-blue-400">/api/process</code>
            </div>
            <p class="text-sm text-gray-400">Main image processing endpoint</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/status/:requestId</code>
            </div>
            <p class="text-sm text-gray-400">Check processing status</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/usage</code>
            </div>
            <p class="text-sm text-gray-400">Check daily API usage</p>
          </div>
          
          <div class="bg-gray-900/50 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <span class="bg-blue-500 text-xs px-2 py-1 rounded mr-3 font-semibold">GET</span>
              <code class="text-blue-400">/api/companies</code>
            </div>
            <p class="text-sm text-gray-400">List insurance companies</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-700/50 mt-12 py-6">
      <div class="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
        <p>XIVIX 2026 Project &copy; Image Intelligence Middleware</p>
        <p class="mt-1">Powered by Cloudflare Workers + Gemini AI + Cloudinary</p>
      </div>
    </footer>

    <script>
      document.getElementById('testForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const responseContent = document.getElementById('responseContent');
        const resultImage = document.getElementById('resultImage');
        const previewImage = document.getElementById('previewImage');
        
        responseContent.textContent = '// Processing...';
        responseContent.className = 'text-yellow-400';
        resultImage.classList.add('hidden');
        
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
          responseContent.className = data.status === 'success' ? 'text-green-400' : 'text-red-400';
          
          if (data.status === 'success' && data.data?.final_url) {
            previewImage.src = data.data.final_url;
            resultImage.classList.remove('hidden');
          }
        } catch (error) {
          responseContent.textContent = JSON.stringify({ error: error.message }, null, 2);
          responseContent.className = 'text-red-400';
        }
      });
      
      // Load companies on page load
      fetch('/api/companies')
        .then(res => res.json())
        .then(data => {
          console.log('Companies loaded:', data.count);
        })
        .catch(err => console.error('Failed to load companies:', err));
    </script>
</body>
</html>
  `);
});

// 404 핸들러
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
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
  console.error('Application error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

export default app;
