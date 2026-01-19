/**
 * XIVIX XIIM - Cloudinary Service
 * URL 기반 이미지 변형 및 마스킹 서비스
 */

import type { 
  CloudinaryTransformParams, 
  CloudinaryMaskingParams, 
  CloudinaryUrlResult,
  MaskingZone 
} from '../types';
import { generateVariantSeed } from '../utils/hash';

/**
 * 랜덤 변주 파라미터 생성
 * 수학적 공식에 따라 유니크한 파라미터 생성
 */
export function generateVariationParams(): CloudinaryTransformParams {
  return {
    // 미세 회전: -3 ~ 3도
    rotation: parseFloat((Math.random() * 6 - 3).toFixed(1)),
    
    // 밝기 조절: -10 ~ 10
    brightness: Math.floor(Math.random() * 21) - 10,
    
    // 대비 조절: -10 ~ 10
    contrast: Math.floor(Math.random() * 21) - 10,
    
    // 크롭 비율: 0.7 ~ 0.9
    crop_scale: parseFloat((0.7 + Math.random() * 0.2).toFixed(2)),
    
    // 크롭 중심점
    crop_gravity: 'center',
    
    // 감마 조절: 0.9 ~ 1.1
    gamma: parseFloat((0.9 + Math.random() * 0.2).toFixed(2))
  };
}

/**
 * 변주 파라미터를 Cloudinary URL 문자열로 변환
 */
export function buildVariationTransformString(params: CloudinaryTransformParams): string {
  const transforms: string[] = [];
  
  // 회전 적용
  if (params.rotation !== 0) {
    transforms.push(`a_${params.rotation}`);
  }
  
  // 밝기 적용
  if (params.brightness !== 0) {
    transforms.push(`e_brightness:${params.brightness}`);
  }
  
  // 대비 적용
  if (params.contrast !== 0) {
    transforms.push(`e_contrast:${params.contrast}`);
  }
  
  // 감마 적용
  if (params.gamma && params.gamma !== 1) {
    // Cloudinary 감마는 -50 ~ 50 범위 (0이 기본값)
    const gammaValue = Math.round((params.gamma - 1) * 100);
    if (gammaValue !== 0) {
      transforms.push(`e_gamma:${gammaValue}`);
    }
  }
  
  // 크롭 적용
  transforms.push(`c_crop,w_${params.crop_scale},h_${params.crop_scale},g_${params.crop_gravity}`);
  
  return transforms.join('/');
}

/**
 * 마스킹 파라미터를 Cloudinary URL 문자열로 변환
 */
export function buildMaskingTransformString(params: CloudinaryMaskingParams): string {
  const transforms: string[] = [];
  
  for (const zone of params.zones) {
    switch (params.type) {
      case 'blur':
        // Blur 마스킹: e_blur_region:800,x_100,y_200,w_50,h_50
        transforms.push(
          `e_blur_region:${params.intensity},x_${Math.round(zone.x)},y_${Math.round(zone.y)},w_${Math.round(zone.width)},h_${Math.round(zone.height)}`
        );
        break;
        
      case 'pixelate':
        // Pixelate 마스킹: e_pixelate_region:20,x_100,y_200,w_50,h_50
        transforms.push(
          `e_pixelate_region:${params.intensity},x_${Math.round(zone.x)},y_${Math.round(zone.y)},w_${Math.round(zone.width)},h_${Math.round(zone.height)}`
        );
        break;
        
      case 'solid':
        // Solid box 오버레이 (별도 레이어 필요)
        // l_xivix:mask_solid/c_scale,w_{width},h_{height}/fl_layer_apply,x_{x},y_{y},g_north_west
        const color = params.overlay_color || 'rgb:333333';
        transforms.push(
          `l_${color},w_${Math.round(zone.width)},h_${Math.round(zone.height)},c_scale/fl_layer_apply,x_${Math.round(zone.x)},y_${Math.round(zone.y)},g_north_west`
        );
        break;
    }
  }
  
  return transforms.join('/');
}

/**
 * 마스킹 스타일 랜덤 선택
 */
export function selectMaskingStyle(): { type: 'blur' | 'pixelate'; intensity: number } {
  const styles = [
    { type: 'blur' as const, intensity: Math.floor(Math.random() * 500) + 500 },  // 500-1000
    { type: 'blur' as const, intensity: Math.floor(Math.random() * 700) + 800 },  // 800-1500
    { type: 'pixelate' as const, intensity: Math.floor(Math.random() * 20) + 10 }, // 10-30
  ];
  
  return styles[Math.floor(Math.random() * styles.length)];
}

/**
 * 유니크 마스킹 URL 생성
 * @param cloudName - Cloudinary 클라우드 이름
 * @param publicId - Cloudinary에 업로드된 원본 이미지 ID
 * @param zones - Gemini가 탐지한 마스킹 좌표 배열
 * @param userId - 사용자 ID (시드 생성용)
 */
export async function generateUniqueImageUrl(
  cloudName: string,
  publicId: string,
  zones: MaskingZone[],
  userId: string
): Promise<CloudinaryUrlResult> {
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  // 1. 변주 시드 생성
  const variantSeed = await generateVariantSeed(userId);
  
  // 2. 변주 파라미터 생성
  const variationParams = generateVariationParams();
  const variationString = buildVariationTransformString(variationParams);
  
  // 3. 마스킹 스타일 선택 및 파라미터 생성
  const maskingStyle = selectMaskingStyle();
  const maskingParams: CloudinaryMaskingParams = {
    type: maskingStyle.type,
    intensity: maskingStyle.intensity,
    zones: zones
  };
  const maskingString = buildMaskingTransformString(maskingParams);
  
  // 4. 전체 변형 문자열 조합
  const transformString = [variationString, maskingString].filter(Boolean).join('/');
  
  // 5. 최종 URL 생성
  const finalUrl = `${baseUrl}/${transformString}/${publicId}`;
  
  return {
    url: finalUrl,
    public_id: publicId,
    transform_string: transformString,
    variant_seed: variantSeed
  };
}

/**
 * 기본 마스킹 URL 생성 (Gemini 좌표 탐지 실패 시)
 * 이미지 중앙부에 기본 블러 적용
 */
export async function generateDefaultMaskingUrl(
  cloudName: string,
  publicId: string,
  imageDimensions: { width: number; height: number },
  userId: string
): Promise<CloudinaryUrlResult> {
  const { width, height } = imageDimensions;
  
  // 중앙 영역 계산 (전체의 60% 영역)
  const defaultZone: MaskingZone = {
    type: 'other',
    x: width * 0.2,
    y: height * 0.2,
    width: width * 0.6,
    height: height * 0.6,
    confidence: 0.5,
    description: 'Default central masking'
  };
  
  return await generateUniqueImageUrl(cloudName, publicId, [defaultZone], userId);
}

/**
 * Cloudinary 서명 URL 업로드 생성
 * 서버에서 서명된 업로드 URL 생성
 */
export async function generateSignedUploadUrl(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  folder: string = 'xivix/raw'
): Promise<{ uploadUrl: string; timestamp: number; signature: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Cloudinary 서명 생성
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(paramsToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  return {
    uploadUrl,
    timestamp,
    signature
  };
}

/**
 * 키워드 정제 함수: 긴 질문을 간결한 타이틀로 요약
 * 
 * @example
 * "30대 워킹맘을 위한 삼성생명 암보험 추천해줘" → "[30대 워킹맘 삼성생명 맞춤안]"
 */
export function generateDynamicTitle(keyword: string | undefined): string {
  if (!keyword) return "맞춤 설계안 예시";

  // 불필요한 조사나 어미 제거
  let cleanKeyword = keyword
    .replace(/을 위한|를 위한|에 대한|에 관한/gi, " ")
    .replace(/추천해줘|추천해주세요|알려줘|알려주세요|보여줘|보여주세요/gi, " ")
    .replace(/해줘|해주세요|줘|주세요/gi, " ")
    .replace(/좀|좀요|요|있을까요|있나요|할까요|할까/gi, " ")
    .replace(/설계안|설계서|보장분석표|가입설계서/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 너무 길면 잘라서 '..' 처리
  if (cleanKeyword.length > 20) {
    cleanKeyword = cleanKeyword.substring(0, 19) + "..";
  }

  if (cleanKeyword.length === 0) {
    return "맞춤 설계안 예시";
  }

  return `[${cleanKeyword} 맞춤안]`;
}

/**
 * 동적 텍스트 오버레이 생성 (Context Overlay)
 * 질문의 핵심 요약을 이미지 상단 중앙에 워터마크로 삽입
 * 
 * 디자인: Noto Sans KR 40px, 흰색 글자, 검정 반투명 배경 박스
 * 
 * @param text - 오버레이 텍스트 (정제된 타이틀)
 * @param options - 스타일 옵션
 */
export function buildTextOverlayString(
  text: string,
  options: {
    position?: 'north_west' | 'north_east' | 'south_west' | 'south_east' | 'north' | 'south';
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    padding?: number;
    opacity?: number;
  } = {}
): string {
  const {
    position = 'north',  // 상단 중앙 (지시사항 반영)
    fontSize = 40,       // 40px (지시사항 반영)
    fontColor = 'white',
    backgroundColor = '000000',  // 검정색 (지시사항 반영)
    padding = 20,        // 박스 내부 여백 20px (지시사항 반영)
    opacity = 70         // 70% 투명도 (지시사항 반영)
  } = options;
  
  // 한글 깨짐 방지를 위한 URL 인코딩
  const encodedText = encodeURIComponent(text)
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']');
  
  // Cloudinary 텍스트 오버레이 포맷 (지시사항 규격):
  // l_text:폰트_크기_스타일:내용 (레이어 텍스트 추가)
  // co_white (글자색 흰색)
  // b_black_o_70 (배경색 검정, 투명도 70% 박스)
  // p_20 (박스 내부 여백 20px)
  // g_north (위치: 상단 중앙 정렬)
  // y_30 (상단에서 30px 아래로 띄움)
  const textOverlay = [
    `l_text:NotoSansKR-Bold.otf_${fontSize}_bold:${encodedText}`,
    `co_${fontColor}`,
    `b_rgb:${backgroundColor}_o_${opacity}`,
    `bo_2px_solid_rgb:4a90d9`  // 파란색 테두리
  ].join(',');
  
  // 위치 적용: 상단 중앙, 30px 아래로 띄움
  const layerApply = `fl_layer_apply,g_${position},y_30`;
  
  return `${textOverlay}/${layerApply}`;
}

/**
 * 키워드에서 동적 타이틀 생성 후 오버레이 파라미터 반환
 * 원스텝 함수: 키워드 → 정제 → Cloudinary 파라미터
 */
export function buildDynamicTitleOverlay(keyword: string | undefined): string {
  const title = generateDynamicTitle(keyword);
  return buildTextOverlayString(title);
}

/**
 * 컨텍스트 기반 최종 URL 생성
 * 변주 + 마스킹 + 동적 타이틀 오버레이 통합
 * 
 * 중요: 마스킹 파라미터 뒤에 타이틀 파라미터를 이어 붙임 (순서 중요)
 * 
 * @param cloudName - Cloudinary 클라우드 이름
 * @param publicId - 업로드된 이미지 ID
 * @param zones - 마스킹 좌표 배열
 * @param userId - 사용자 ID
 * @param keyword - 원본 키워드 (동적 타이틀 생성용)
 */
export async function generateUniqueImageUrlWithContext(
  cloudName: string,
  publicId: string,
  zones: MaskingZone[],
  userId: string,
  keyword?: string
): Promise<CloudinaryUrlResult> {
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  // 1. 변주 시드 생성
  const variantSeed = await generateVariantSeed(userId);
  
  // 2. 변주 파라미터 생성
  const variationParams = generateVariationParams();
  const variationString = buildVariationTransformString(variationParams);
  
  // 3. 마스킹 스타일 선택 및 파라미터 생성
  const maskingStyle = selectMaskingStyle();
  const maskingParams: CloudinaryMaskingParams = {
    type: maskingStyle.type,
    intensity: maskingStyle.intensity,
    zones: zones
  };
  const maskingString = buildMaskingTransformString(maskingParams);
  
  // 4. 동적 타이틀 오버레이 생성 (키워드에서 정제된 타이틀)
  // 지시사항: 마스킹 후 → 텍스트 얹기 순서
  let textOverlayString = '';
  if (keyword) {
    // 키워드를 정제하여 "[30대 워킹맘 삼성생명 맞춤안]" 형식의 타이틀 생성
    textOverlayString = buildDynamicTitleOverlay(keyword);
    console.log(`[Cloudinary] 동적 타이틀 생성: ${generateDynamicTitle(keyword)}`);
  }
  
  // 5. 전체 변형 문자열 조합 (순서: 변주 → 마스킹 → 타이틀)
  const transformParts = [variationString, maskingString, textOverlayString].filter(Boolean);
  const transformString = transformParts.join('/');
  
  // 6. 최종 URL 생성
  const finalUrl = `${baseUrl}/${transformString}/${publicId}`;
  
  return {
    url: finalUrl,
    public_id: publicId,
    transform_string: transformString,
    variant_seed: variantSeed
  };
}

/**
 * Cloudinary에 이미지 업로드 (Signed Upload 사용)
 */
export async function uploadToCloudinary(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  imageData: ArrayBuffer | Blob,
  fileName: string,
  folder: string = 'xivix/raw'
): Promise<{ success: boolean; public_id?: string; url?: string; error?: string }> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Cloudinary 서명 생성 (SHA-1)
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const formData = new FormData();
    
    // ArrayBuffer를 Blob으로 변환
    const blob = imageData instanceof Blob 
      ? imageData 
      : new Blob([imageData], { type: 'image/png' });
    
    formData.append('file', blob, fileName);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `Cloudinary upload failed: ${response.status} - ${errorText}` 
      };
    }
    
    const result = await response.json();
    
    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url
    };
  } catch (error) {
    return {
      success: false,
      error: `Cloudinary upload error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
