/**
 * XIVIX XIIM - API Routes
 * Hono 라우터 정의
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, XIIMRequest, XIIMResponse } from '../types';
import { executePipeline } from '../services/pipeline';
import { 
  getAllInsuranceCompanies, 
  getInsuranceCompaniesByCategory,
  getImageLogByRequestId,
  checkDailyUsage,
  authenticateUser
} from '../services/database';
import { generateVariationParams, buildVariationTransformString } from '../services/cloudinary';

const api = new Hono<{ Bindings: Env }>();

// CORS 설정
api.use('/*', cors({
  origin: ['https://xivix-2026-pro.pages.dev', 'http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));

// ============================================
// Health Check
// ============================================

api.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'XIVIX Image Intelligence Middleware (XIIM)',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Main Image Processing Endpoint
// ============================================

/**
 * POST /api/process
 * 메인 이미지 처리 파이프라인 실행
 */
api.post('/process', async (c) => {
  try {
    const body = await c.req.json<XIIMRequest>();
    
    // 요청 유효성 검증
    if (!body.api_key) {
      return c.json<XIIMResponse>({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'API key is required'
        },
        request_id: 'none'
      }, 400);
    }
    
    if (!body.request_info?.keyword || !body.request_info?.user_id) {
      return c.json<XIIMResponse>({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'keyword and user_id are required in request_info'
        },
        request_id: 'none'
      }, 400);
    }
    
    // 파이프라인 실행
    const result = await executePipeline(c.env, body);
    
    const statusCode = result.status === 'success' ? 200 : 
                       result.error?.code === 'AUTH_FAILED' ? 401 :
                       result.error?.code === 'RATE_LIMIT' ? 429 : 500;
    
    return c.json(result, statusCode);
  } catch (error) {
    console.error('Process endpoint error:', error);
    return c.json<XIIMResponse>({
      status: 'error',
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      request_id: 'none'
    }, 500);
  }
});

// ============================================
// Status & Lookup Endpoints
// ============================================

/**
 * GET /api/status/:requestId
 * 처리 상태 조회
 */
api.get('/status/:requestId', async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const apiKey = c.req.header('X-API-Key');
    
    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401);
    }
    
    // 인증 확인
    const authResult = await authenticateUser(c.env.DB, apiKey);
    if (!authResult.success) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    
    const log = await getImageLogByRequestId(c.env.DB, requestId);
    
    if (!log) {
      return c.json({ error: 'Request not found' }, 404);
    }
    
    return c.json({
      request_id: log.request_id,
      status: log.status,
      final_url: log.final_url,
      created_at: log.created_at,
      completed_at: log.completed_at,
      processing_time_ms: log.processing_time_ms,
      error_message: log.error_message
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch status' }, 500);
  }
});

/**
 * GET /api/usage
 * 일일 사용량 조회
 */
api.get('/usage', async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    
    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401);
    }
    
    const authResult = await authenticateUser(c.env.DB, apiKey);
    if (!authResult.success || !authResult.user) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    
    const usage = await checkDailyUsage(c.env.DB, authResult.user.user_id);
    
    return c.json({
      user_id: authResult.user.user_id,
      tier: authResult.user.tier,
      usage: {
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining
      },
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch usage' }, 500);
  }
});

// ============================================
// Reference Data Endpoints
// ============================================

/**
 * GET /api/companies
 * 보험사 목록 조회
 */
api.get('/companies', async (c) => {
  try {
    const category = c.req.query('category') as 'LIFE' | 'NON_LIFE' | undefined;
    
    let companies;
    if (category) {
      companies = await getInsuranceCompaniesByCategory(c.env.DB, category);
    } else {
      companies = await getAllInsuranceCompanies(c.env.DB);
    }
    
    return c.json({
      count: companies.length,
      companies: companies.map(c => ({
        code: c.code,
        name_ko: c.name_ko,
        name_en: c.name_en,
        category: c.category
      }))
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch companies' }, 500);
  }
});

// ============================================
// Utility Endpoints
// ============================================

/**
 * POST /api/preview-transform
 * 변주 파라미터 미리보기 (Cloudinary URL 생성만)
 */
api.post('/preview-transform', async (c) => {
  try {
    const { public_id, zones } = await c.req.json();
    
    if (!public_id) {
      return c.json({ error: 'public_id is required' }, 400);
    }
    
    // 변주 파라미터 생성
    const params = generateVariationParams();
    const transformString = buildVariationTransformString(params);
    
    const previewUrl = `https://res.cloudinary.com/${c.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}/${public_id}`;
    
    return c.json({
      preview_url: previewUrl,
      transform_string: transformString,
      parameters: params
    });
  } catch (error) {
    return c.json({ error: 'Failed to generate preview' }, 500);
  }
});

/**
 * POST /api/test-gemini
 * Gemini 2.0 Flash 분석 테스트 (개발용)
 */
api.post('/test-gemini', async (c) => {
  try {
    const { image_url } = await c.req.json();
    
    if (!image_url) {
      return c.json({ error: 'image_url is required' }, 400);
    }
    
    // Gemini 분석 실행
    const { analyzeImageWithGemini, DEFAULT_IMAGE_DIMENSIONS } = await import('../services/gemini');
    const result = await analyzeImageWithGemini(
      c.env.GEMINI_API_KEY,
      image_url,
      DEFAULT_IMAGE_DIMENSIONS
    );
    
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Gemini test failed', details: error instanceof Error ? error.message : 'Unknown' }, 500);
  }
});

/**
 * GET /api/test-naver
 * 네이버 검색 API 테스트
 */
api.get('/test-naver', async (c) => {
  try {
    const keyword = c.req.query('keyword') || '삼성생명 설계안';
    
    const { searchInsuranceContent } = await import('../services/naver');
    const result = await searchInsuranceContent(
      c.env.NAVER_CLIENT_ID,
      c.env.NAVER_CLIENT_SECRET,
      keyword
    );
    
    return c.json({
      keyword,
      ...result,
      count: result.targets?.length || 0
    });
  } catch (error) {
    return c.json({ 
      error: '네이버 검색 테스트 실패', 
      details: error instanceof Error ? error.message : 'Unknown' 
    }, 500);
  }
});

/**
 * GET /api/test-pipeline
 * 전체 파이프라인 간단 테스트 (source_url 필수)
 */
api.get('/test-pipeline', async (c) => {
  try {
    const imageUrl = c.req.query('image_url');
    
    if (!imageUrl) {
      return c.json({ 
        error: 'image_url 쿼리 파라미터가 필요합니다',
        example: '/api/test-pipeline?image_url=https://example.com/image.png'
      }, 400);
    }
    
    // 간단한 테스트용 요청
    const testRequest = {
      api_key: 'dev_test_api_key_12345',
      request_info: {
        keyword: '테스트 설계안',
        target_company: 'SAMSUNG_LIFE',
        user_id: 'test_user',
        source_url: imageUrl
      }
    };
    
    const { executePipeline } = await import('../services/pipeline');
    const result = await executePipeline(c.env, testRequest);
    
    return c.json(result);
  } catch (error) {
    return c.json({ 
      error: '파이프라인 테스트 실패', 
      details: error instanceof Error ? error.message : 'Unknown' 
    }, 500);
  }
});

export default api;
