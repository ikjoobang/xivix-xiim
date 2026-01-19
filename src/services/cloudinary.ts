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
