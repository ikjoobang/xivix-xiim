/**
 * XIVIX XIIM - Browserless Service
 * Browserless.io를 사용한 웹 스크래핑 및 스크린샷 캡처
 */

import type { BrowserlessScreenshotRequest, BrowserlessScreenshotResponse } from '../types';

/** Browserless API 엔드포인트 */
const BROWSERLESS_API_URL = 'https://chrome.browserless.io';

/**
 * 네이버 이미지 검색 URL 생성
 */
export function buildNaverImageSearchUrl(keyword: string): string {
  const encodedKeyword = encodeURIComponent(keyword);
  return `https://search.naver.com/search.naver?where=image&sm=tab_jum&query=${encodedKeyword}`;
}

/**
 * 유튜브 검색 URL 생성
 */
export function buildYoutubeSearchUrl(keyword: string): string {
  const encodedKeyword = encodeURIComponent(keyword);
  return `https://www.youtube.com/results?search_query=${encodedKeyword}`;
}

/**
 * Browserless를 사용하여 스크린샷 캡처
 */
export async function captureScreenshot(
  apiKey: string,
  request: BrowserlessScreenshotRequest
): Promise<BrowserlessScreenshotResponse> {
  try {
    const options = request.options || {};
    
    const response = await fetch(`${BROWSERLESS_API_URL}/screenshot?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        url: request.url,
        options: {
          fullPage: options.fullPage ?? false,
          type: options.type ?? 'png',
          quality: options.quality ?? 90
        },
        viewport: options.viewport ?? {
          width: 1920,
          height: 1080
        },
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Browserless screenshot failed: ${response.status} - ${errorText}`
      };
    }
    
    const imageData = await response.arrayBuffer();
    
    return {
      success: true,
      image_data: imageData
    };
  } catch (error) {
    return {
      success: false,
      error: `Browserless error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Browserless를 사용하여 페이지 내 특정 요소 스크린샷
 */
export async function captureElementScreenshot(
  apiKey: string,
  url: string,
  selector: string
): Promise<BrowserlessScreenshotResponse> {
  try {
    const response = await fetch(`${BROWSERLESS_API_URL}/screenshot?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        options: {
          type: 'png',
          quality: 95
        },
        selector,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Browserless element screenshot failed: ${response.status} - ${errorText}`
      };
    }
    
    const imageData = await response.arrayBuffer();
    
    return {
      success: true,
      image_data: imageData
    };
  } catch (error) {
    return {
      success: false,
      error: `Browserless error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Browserless를 사용하여 페이지에서 이미지 URL 추출
 */
export async function extractImageUrls(
  apiKey: string,
  searchUrl: string,
  maxImages: number = 10
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  try {
    // Browserless의 /function API를 사용하여 JavaScript 실행
    const response = await fetch(`${BROWSERLESS_API_URL}/function?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: `
          module.exports = async ({ page }) => {
            await page.goto('${searchUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
            
            // 스크롤하여 더 많은 이미지 로드
            await page.evaluate(() => {
              window.scrollBy(0, 1000);
            });
            await page.waitForTimeout(2000);
            
            // 이미지 URL 추출
            const images = await page.evaluate((max) => {
              const imgs = document.querySelectorAll('img[src*="http"]');
              const urls = [];
              for (let i = 0; i < Math.min(imgs.length, max); i++) {
                const src = imgs[i].src;
                // 필터링: 썸네일이 아닌 실제 이미지만
                if (src && !src.includes('thumb') && !src.includes('icon') && 
                    (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg') || src.includes('.webp'))) {
                  urls.push(src);
                }
              }
              return urls;
            }, ${maxImages});
            
            return { urls: images };
          };
        `,
        context: {}
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Browserless function failed: ${response.status} - ${errorText}`
      };
    }
    
    const result = await response.json();
    
    return {
      success: true,
      urls: result.urls || []
    };
  } catch (error) {
    return {
      success: false,
      error: `Browserless extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 이미지 유효성 검증
 * - 최소 크기 체크 (10KB 이상)
 * - 이미지 시그니처(매직 바이트) 체크
 * - Content-Type 체크
 */
export function validateImageData(
  data: ArrayBuffer, 
  contentType?: string
): { valid: boolean; error?: string } {
  // 1. 최소 크기 체크 (10KB 미만은 대부분 깨진 파일이나 placeholder)
  const MIN_IMAGE_SIZE = 10 * 1024; // 10KB
  if (data.byteLength < MIN_IMAGE_SIZE) {
    return { 
      valid: false, 
      error: `이미지 크기 부족: ${data.byteLength} bytes (최소 ${MIN_IMAGE_SIZE} bytes 필요)` 
    };
  }
  
  // 2. 이미지 매직 바이트 체크
  const bytes = new Uint8Array(data.slice(0, 12));
  
  // JPEG: FF D8 FF
  const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  
  // GIF: 47 49 46 38
  const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                 bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  
  if (!isJPEG && !isPNG && !isGIF && !isWebP) {
    return { 
      valid: false, 
      error: `유효하지 않은 이미지 형식 (매직 바이트: ${Array.from(bytes.slice(0, 4)).map(b => b.toString(16)).join(' ')})` 
    };
  }
  
  // 3. Content-Type 체크 (있을 경우)
  if (contentType) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.some(t => contentType.includes(t))) {
      return { 
        valid: false, 
        error: `유효하지 않은 Content-Type: ${contentType}` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * 이미지 다운로드 에러 코드 정의
 */
export type ImageDownloadErrorCode = 
  | 'HTTP_ERROR'           // HTTP 상태 코드 오류 (404, 403 등)
  | 'CONTENT_TYPE_ERROR'   // Content-Type이 이미지가 아님 (text/html 등)
  | 'HTML_RESPONSE'        // 응답이 HTML 페이지 (에러 페이지, 차단 페이지)
  | 'INVALID_FORMAT'       // 유효하지 않은 이미지 형식
  | 'SIZE_TOO_SMALL'       // 이미지 크기가 너무 작음
  | 'NETWORK_ERROR'        // 네트워크 오류
  | 'BLOCKED_ACCESS';      // 접근 차단됨

export interface ImageDownloadResult {
  success: boolean;
  data?: ArrayBuffer;
  contentType?: string;
  error?: string;
  errorCode?: ImageDownloadErrorCode;
  statusCode?: number;
}

/**
 * URL에서 Referer 도메인 추출
 */
function extractRefererDomain(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return 'https://www.google.com';
  }
}

/**
 * 랜덤 User-Agent 생성 (봇 탐지 우회)
 * 
 * V3.4 체크리스트: 헤더 보정의 유연성
 * - 고정 User-Agent 사용 시 패턴 분석으로 차단될 수 있음
 * - 다양한 브라우저/OS 조합으로 랜덤 선택
 */
function getRandomUserAgent(): string {
  const userAgents = [
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Chrome on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    // Safari on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    // Mobile Chrome (한국 모바일 트래픽 비중 고려)
    'Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/** 
 * 이미지 다운로드 타임아웃 (밀리초)
 * 
 * V3.4 체크리스트: 타임아웃 설정
 * - 보험사 서버 응답 지연 대비
 * - 권장 범위: 5~8초
 */
const DOWNLOAD_TIMEOUT_MS = 8000; // 8초

/**
 * HTML 응답인지 매직 바이트로 확인
 * HTML은 보통 '<' (0x3C)로 시작하거나 '<!DOCTYPE' (3C 21 44 4F)로 시작
 */
function isHtmlResponse(data: ArrayBuffer): boolean {
  if (data.byteLength < 10) return false;
  
  const bytes = new Uint8Array(data.slice(0, 20));
  
  // <!DOCTYPE html (3C 21 44 4F 43 54 59 50 45)
  if (bytes[0] === 0x3C && bytes[1] === 0x21 && bytes[2] === 0x44 && bytes[3] === 0x4F) {
    return true;
  }
  
  // <html (3C 68 74 6D 6C) or <HTML
  if (bytes[0] === 0x3C && (
    (bytes[1] === 0x68 && bytes[2] === 0x74 && bytes[3] === 0x6D && bytes[4] === 0x6C) ||
    (bytes[1] === 0x48 && bytes[2] === 0x54 && bytes[3] === 0x4D && bytes[4] === 0x4C)
  )) {
    return true;
  }
  
  // BOM + HTML (EF BB BF + <)
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF && bytes[3] === 0x3C) {
    return true;
  }
  
  // 단순 '<' 시작 (대부분의 HTML)
  if (bytes[0] === 0x3C) {
    // 추가 확인: 처음 100바이트에 html, HTML, head, body 등이 있는지
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const text = textDecoder.decode(data.slice(0, 100)).toLowerCase();
    if (text.includes('<!doctype') || text.includes('<html') || text.includes('<head')) {
      return true;
    }
  }
  
  return false;
}

/**
 * 특정 URL의 이미지 직접 다운로드 (강화된 검증 포함)
 * 
 * V3.4 체크리스트:
 * [필수] 상태 코드 검증: HTTP 200 OK 확인
 * [필수] MIME 타입 체크: Content-Type이 image/* 인지 확인
 * [필수] HTML 응답 감지: text/html 또는 매직바이트로 HTML 감지
 * [V3.4] 헤더 보정 유연성: 랜덤 User-Agent 사용
 * [V3.4] 타임아웃 설정: 8초 (DOWNLOAD_TIMEOUT_MS)
 */
export async function downloadImage(
  imageUrl: string
): Promise<ImageDownloadResult> {
  try {
    // Referer 추출 (보험사 사이트 차단 우회용)
    const referer = extractRefererDomain(imageUrl);
    
    // V3.4: 랜덤 User-Agent 사용 (패턴 분석 차단 우회)
    const userAgent = getRandomUserAgent();
    
    // V3.4: AbortController를 사용한 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    
    let response: Response;
    try {
      response = await fetch(imageUrl, {
        headers: {
          // V3.4: 랜덤 User-Agent로 봇 탐지 우회
          'User-Agent': userAgent,
          // Referer 설정으로 차단 우회
          'Referer': referer,
          // Accept 헤더로 이미지만 요청
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal  // V3.4: 타임아웃 시그널
      });
    } finally {
      clearTimeout(timeoutId);  // 타임아웃 클리어
    }
    
    // ============================================
    // [필수] 상태 코드 검증
    // ============================================
    if (!response.ok) {
      const statusCode = response.status;
      
      // 구체적인 에러 메시지 생성
      let errorMessage: string;
      let errorCode: ImageDownloadErrorCode;
      
      switch (statusCode) {
        case 404:
          errorMessage = '이미지가 존재하지 않습니다 (404 Not Found)';
          errorCode = 'HTTP_ERROR';
          break;
        case 403:
          errorMessage = '이미지 접근이 차단되었습니다 (403 Forbidden)';
          errorCode = 'BLOCKED_ACCESS';
          break;
        case 401:
          errorMessage = '이미지 접근 권한이 없습니다 (401 Unauthorized)';
          errorCode = 'BLOCKED_ACCESS';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = '이미지 서버에 오류가 발생했습니다 (서버 오류)';
          errorCode = 'HTTP_ERROR';
          break;
        default:
          errorMessage = `이미지 다운로드 실패 (HTTP ${statusCode})`;
          errorCode = 'HTTP_ERROR';
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode,
        statusCode
      };
    }
    
    // ============================================
    // [필수] MIME 타입 체크 (Content-Type 헤더 선검증)
    // ============================================
    const contentType = response.headers.get('content-type') || '';
    const contentTypeLower = contentType.toLowerCase();
    
    // text/html인 경우 즉시 예외 처리 (에러 페이지, 차단 페이지)
    if (contentTypeLower.includes('text/html') || contentTypeLower.includes('text/plain')) {
      return {
        success: false,
        error: '이미지가 아닌 웹페이지가 반환되었습니다. 이미지 접근이 차단되었거나 존재하지 않습니다.',
        errorCode: 'CONTENT_TYPE_ERROR',
        statusCode: response.status
      };
    }
    
    // application/json인 경우 (API 에러 응답)
    if (contentTypeLower.includes('application/json')) {
      return {
        success: false,
        error: '이미지 서버에서 API 에러 응답이 반환되었습니다.',
        errorCode: 'CONTENT_TYPE_ERROR',
        statusCode: response.status
      };
    }
    
    // Content-Type이 image/* 가 아닌 경우 경고 (하지만 바이너리 데이터는 확인)
    const isImageContentType = contentTypeLower.includes('image/');
    
    // 데이터 다운로드
    const data = await response.arrayBuffer();
    
    // ============================================
    // [필수] HTML 응답 감지 (매직 바이트 체크)
    // ============================================
    if (isHtmlResponse(data)) {
      // HTML 응답의 처음 200자를 로깅 (디버깅용)
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const previewText = textDecoder.decode(data.slice(0, 200));
      console.log(`[downloadImage] HTML 응답 감지됨: ${previewText.substring(0, 100)}...`);
      
      return {
        success: false,
        error: '이미지 대신 HTML 에러 페이지가 반환되었습니다. 원본 사이트에서 이미지 접근을 차단했을 수 있습니다.',
        errorCode: 'HTML_RESPONSE',
        statusCode: response.status
      };
    }
    
    // ============================================
    // 이미지 유효성 검증 (매직 바이트 + 크기)
    // ============================================
    const validation = validateImageData(data, isImageContentType ? contentType : undefined);
    if (!validation.valid) {
      // 에러 타입 분류
      const errorCode: ImageDownloadErrorCode = validation.error?.includes('크기') 
        ? 'SIZE_TOO_SMALL' 
        : 'INVALID_FORMAT';
      
      return {
        success: false,
        error: `이미지 파일이 유효하지 않습니다: ${validation.error}`,
        errorCode,
        statusCode: response.status
      };
    }
    
    return {
      success: true,
      data,
      contentType: isImageContentType ? contentType : 'image/png',
      statusCode: response.status
    };
    
  } catch (error) {
    // 네트워크 오류 처리
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : '';
    
    // V3.4: AbortError 처리 (타임아웃)
    if (errorName === 'AbortError' || errorMessage.includes('aborted')) {
      return {
        success: false,
        error: `이미지 다운로드 시간이 초과되었습니다 (${DOWNLOAD_TIMEOUT_MS / 1000}초). 서버 응답이 느립니다.`,
        errorCode: 'NETWORK_ERROR'
      };
    }
    
    // 구체적인 네트워크 오류 분류
    let userFriendlyMessage: string;
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      userFriendlyMessage = '네트워크 연결 오류가 발생했습니다. 이미지 서버에 연결할 수 없습니다.';
    } else if (errorMessage.includes('timeout')) {
      userFriendlyMessage = `이미지 다운로드 시간이 초과되었습니다 (${DOWNLOAD_TIMEOUT_MS / 1000}초).`;
    } else if (errorMessage.includes('SSL') || errorMessage.includes('certificate')) {
      userFriendlyMessage = 'SSL 인증서 오류가 발생했습니다.';
    } else {
      userFriendlyMessage = `이미지 다운로드 중 오류가 발생했습니다: ${errorMessage}`;
    }
    
    return {
      success: false,
      error: userFriendlyMessage,
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * 보험 설계안 이미지 검색 키워드 최적화
 */
export function optimizeSearchKeyword(keyword: string, targetCompany?: string): string {
  // 기본 키워드에 '설계안', '보장분석' 등 추가
  let optimized = keyword;
  
  if (!keyword.includes('설계안') && !keyword.includes('보장분석')) {
    optimized += ' 설계안';
  }
  
  // 보험사 한글명 매핑
  const companyNameMap: Record<string, string> = {
    'SAMSUNG_LIFE': '삼성생명',
    'HANWHA_LIFE': '한화생명',
    'KYOBO_LIFE': '교보생명',
    'NH_LIFE': 'NH농협생명',
    'SHINHAN_LIFE': '신한라이프',
    'SAMSUNG_FIRE': '삼성화재',
    'HYUNDAI_MARINE': '현대해상',
    'DB_INSURANCE': 'DB손해보험',
    'KB_INSURANCE': 'KB손해보험',
    'MERITZ_FIRE': '메리츠화재'
  };
  
  if (targetCompany && companyNameMap[targetCompany]) {
    if (!keyword.includes(companyNameMap[targetCompany])) {
      optimized = `${companyNameMap[targetCompany]} ${optimized}`;
    }
  }
  
  return optimized;
}
