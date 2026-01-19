/**
 * XIVIX XIIM - Gemini Vision Service
 * Google Gemini 1.5 Flash를 사용한 이미지 분석 및 좌표 추출
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
 * 이미지 분석을 위한 프롬프트
 */
const MASKING_DETECTION_PROMPT = `
You are an expert image analyzer for insurance documents. Analyze this image and identify ALL regions that contain sensitive personal information that needs to be masked.

IMPORTANT: Return coordinates as PERCENTAGES (0-100) of the image dimensions, not pixel values.

Identify and return coordinates for:
1. **name** - Personal names (고객명, 피보험자, 계약자)
2. **logo** - Insurance company logos
3. **premium** - Premium amounts, coverage amounts (보험료, 보장금액)
4. **phone** - Phone numbers
5. **id_number** - ID numbers, registration numbers (주민번호, 증권번호)
6. **address** - Addresses
7. **other** - Any other personally identifiable information

Return ONLY a valid JSON object in this exact format:
{
  "success": true,
  "zones": [
    {
      "type": "name",
      "x_percent": 10.5,
      "y_percent": 20.3,
      "width_percent": 15.2,
      "height_percent": 3.5,
      "confidence": 0.95,
      "description": "Customer name field"
    }
  ],
  "insurance_info": {
    "company": "Detected company name or null",
    "product_name": "Detected product name or null",
    "coverage_type": "Life/Non-Life/Health or null"
  }
}

If no sensitive information is detected, return:
{
  "success": true,
  "zones": [],
  "insurance_info": null
}

CRITICAL: Return ONLY the JSON object, no markdown formatting, no code blocks, no explanations.
`;

/**
 * URL에서 이미지를 Base64로 변환
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  return {
    data: base64,
    mimeType: contentType
  };
}

/**
 * ArrayBuffer를 Base64로 변환
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
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
    
    // Gemini API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      
      // 퍼센트 좌표를 픽셀 좌표로 변환
      const zones: MaskingZone[] = (parsed.zones || []).map((zone: any) => ({
        type: zone.type || 'other',
        x: Math.round((zone.x_percent / 100) * imageDimensions.width),
        y: Math.round((zone.y_percent / 100) * imageDimensions.height),
        width: Math.round((zone.width_percent / 100) * imageDimensions.width),
        height: Math.round((zone.height_percent / 100) * imageDimensions.height),
        confidence: zone.confidence || 0.5,
        description: zone.description
      }));
      
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
