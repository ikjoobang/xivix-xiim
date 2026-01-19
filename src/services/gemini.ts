/**
 * XIVIX XIIM - Gemini Vision Service
 * Google Gemini 2.0 Flash를 사용한 이미지 분석 및 좌표 추출
 * 
 * 업데이트: Gemini 2.0 Flash로 업그레이드 (속도 + 정확도 향상)
 */

import type { MaskingZone, GeminiAnalysisResponse } from '../types';

/** Gemini API 응답 타입 */
interface GeminiAPIResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

/**
 * 이미지 분석을 위한 프롬프트 (보험 설계서 전용)
 * Gemini 2.0 Flash 최적화
 */
const MASKING_DETECTION_PROMPT = `
당신은 보험 설계서 이미지 분석 전문가입니다. 이 이미지에서 마스킹이 필요한 개인정보 영역을 모두 식별하세요.

**중요**: 좌표는 이미지 전체 크기 대비 0~1000 단위의 상대 좌표로 반환하세요.
- [ymin, xmin, ymax, xmax] 형식 사용
- 예: 이미지 좌측 상단 10%, 상단 20% 위치 = [200, 100, ...]

**식별 대상**:
1. **name** - 이름 (고객명, 피보험자, 계약자, 수익자)
2. **logo** - 보험사 로고
3. **premium** - 금액 (보험료, 보장금액, 합계, 월납입료)
4. **phone** - 연락처 (전화번호, 휴대폰)
5. **id_number** - 식별번호 (주민번호, 증권번호, 계약번호)
6. **address** - 주소
7. **other** - 기타 개인식별정보

**응답 형식** (JSON만 반환):
{
  "success": true,
  "zones": [
    {
      "type": "name",
      "box_2d": [ymin, xmin, ymax, xmax],
      "confidence": 0.95,
      "description": "피보험자 성명"
    }
  ],
  "insurance_info": {
    "company": "감지된 보험사명",
    "product_name": "상품명",
    "coverage_type": "생명보험/손해보험/건강보험"
  }
}

**규칙**:
- JSON만 반환, 마크다운 금지
- 좌표는 0~1000 범위의 정수
- 개인정보가 없으면 zones를 빈 배열로 반환
`;

/**
 * 대체 프롬프트 (퍼센트 기반 - 폴백용)
 */
const MASKING_DETECTION_PROMPT_PERCENT = `
You are an expert image analyzer for insurance documents. Analyze this image and identify ALL regions that contain sensitive personal information that needs to be masked.

IMPORTANT: Return coordinates as PERCENTAGES (0-100) of the image dimensions.

Identify:
1. **name** - Personal names (고객명, 피보험자)
2. **logo** - Insurance company logos
3. **premium** - Amounts (보험료, 보장금액)
4. **phone** - Phone numbers
5. **id_number** - ID numbers (주민번호, 증권번호)
6. **address** - Addresses

Return ONLY JSON:
{
  "success": true,
  "zones": [
    {
      "type": "name",
      "x_percent": 10.5,
      "y_percent": 20.3,
      "width_percent": 15.2,
      "height_percent": 3.5,
      "confidence": 0.95
    }
  ]
}
`;

/**
 * URL에서 이미지를 Base64로 변환 (메모리 효율적 방식)
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64Chunked(arrayBuffer);
  
  return {
    data: base64,
    mimeType: contentType
  };
}

/**
 * ArrayBuffer를 Base64로 변환 (청크 방식으로 메모리 오버플로우 방지)
 */
function arrayBufferToBase64Chunked(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // 8KB 청크
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

/**
 * ArrayBuffer를 Base64로 변환 (레거시 호환)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return arrayBufferToBase64Chunked(buffer);
}

/**
 * Gemini API를 사용하여 이미지 분석
 */
export async function analyzeImageWithGemini(
  apiKey: string,
  imageSource: string | ArrayBuffer,
  imageDimensions: { width: number; height: number }
): Promise<GeminiAnalysisResponse> {
  try {
    // 이미지 데이터 준비
    let imageData: string;
    let mimeType: string;
    
    if (typeof imageSource === 'string') {
      // URL인 경우
      const fetched = await fetchImageAsBase64(imageSource);
      imageData = fetched.data;
      mimeType = fetched.mimeType;
    } else {
      // ArrayBuffer인 경우
      imageData = arrayBufferToBase64(imageSource);
      mimeType = 'image/png';
    }
    
    // Gemini 2.0 Flash API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageData
                  }
                },
                {
                  text: MASKING_DETECTION_PROMPT
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        zones: [],
        image_dimensions: imageDimensions,
        error: `Gemini API error: ${response.status} - ${errorText}`
      };
    }
    
    const result: GeminiAPIResponse = await response.json();
    
    // 응답 파싱
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      return {
        success: false,
        zones: [],
        image_dimensions: imageDimensions,
        error: 'No response from Gemini'
      };
    }
    
    // JSON 파싱 시도
    try {
      // 마크다운 코드 블록 제거
      let cleanedText = textContent.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();
      
      const parsed = JSON.parse(cleanedText);
      
      // 좌표 변환 (box_2d 또는 percent 방식 지원)
      const zones: MaskingZone[] = (parsed.zones || []).map((zone: any) => {
        // box_2d 형식 [ymin, xmin, ymax, xmax] (0-1000 범위)
        if (zone.box_2d && Array.isArray(zone.box_2d)) {
          const [ymin, xmin, ymax, xmax] = zone.box_2d;
          return {
            type: zone.type || 'other',
            x: Math.round((xmin / 1000) * imageDimensions.width),
            y: Math.round((ymin / 1000) * imageDimensions.height),
            width: Math.round(((xmax - xmin) / 1000) * imageDimensions.width),
            height: Math.round(((ymax - ymin) / 1000) * imageDimensions.height),
            confidence: zone.confidence || 0.5,
            description: zone.description
          };
        }
        
        // percent 형식 (폴백)
        return {
          type: zone.type || 'other',
          x: Math.round((zone.x_percent / 100) * imageDimensions.width),
          y: Math.round((zone.y_percent / 100) * imageDimensions.height),
          width: Math.round((zone.width_percent / 100) * imageDimensions.width),
          height: Math.round((zone.height_percent / 100) * imageDimensions.height),
          confidence: zone.confidence || 0.5,
          description: zone.description
        };
      });
      
      return {
        success: true,
        zones,
        image_dimensions: imageDimensions,
        insurance_info: parsed.insurance_info
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', textContent);
      return {
        success: false,
        zones: [],
        image_dimensions: imageDimensions,
        error: `Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      zones: [],
      image_dimensions: imageDimensions,
      error: `Gemini analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 이미지 URL에서 크기 정보 추출 (Cloudinary URL 기준)
 */
export function extractImageDimensionsFromUrl(url: string): { width: number; height: number } | null {
  // Cloudinary URL 패턴에서 크기 추출 시도
  const widthMatch = url.match(/w_(\d+)/);
  const heightMatch = url.match(/h_(\d+)/);
  
  if (widthMatch && heightMatch) {
    return {
      width: parseInt(widthMatch[1]),
      height: parseInt(heightMatch[1])
    };
  }
  
  return null;
}

/**
 * 기본 이미지 크기 (분석 실패 시 사용)
 */
export const DEFAULT_IMAGE_DIMENSIONS = {
  width: 1200,
  height: 1600
};

/**
 * 신뢰도 기준 이상의 존만 필터링
 */
export function filterHighConfidenceZones(
  zones: MaskingZone[],
  minConfidence: number = 0.7
): MaskingZone[] {
  return zones.filter(zone => zone.confidence >= minConfidence);
}
