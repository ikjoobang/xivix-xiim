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
 * 특정 URL의 이미지 직접 다운로드
 */
export async function downloadImage(
  imageUrl: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Image download failed: ${response.status}`
      };
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    const data = await response.arrayBuffer();
    
    return {
      success: true,
      data,
      contentType
    };
  } catch (error) {
    return {
      success: false,
      error: `Image download error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
