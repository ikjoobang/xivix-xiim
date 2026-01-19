/**
 * XIVIX XIIM - Hash Utilities
 * 해시 생성 및 중복 체크 유틸리티
 */

/**
 * 문자열을 SHA-256 해시로 변환
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * ArrayBuffer를 SHA-256 해시로 변환 (이미지 해싱용)
 */
export async function hashArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 유니크 변주 시드 생성
 * Seed = Hash(User_ID + Timestamp + Random)
 */
export async function generateVariantSeed(userId: string): Promise<string> {
  const timestamp = Date.now();
  const random = crypto.getRandomValues(new Uint8Array(16));
  const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const input = `${userId}_${timestamp}_${randomHex}`;
  const hash = await sha256(input);
  
  // 앞 12자리만 사용하여 시드 생성
  return `s_${hash.substring(0, 12)}`;
}

/**
 * 요청 ID 생성 (UUID v4 형식)
 */
export function generateRequestId(): string {
  const uuid = crypto.randomUUID();
  return `vix_${uuid.replace(/-/g, '').substring(0, 12)}`;
}

/**
 * 결합 해시 생성 (중복 체크용)
 * Combined Hash = Hash(Source Hash + Variant Seed)
 */
export async function generateCombinedHash(
  sourceHash: string,
  variantSeed: string
): Promise<string> {
  return await sha256(`${sourceHash}_${variantSeed}`);
}

/**
 * API 키 해시 생성 (저장용)
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  // 솔트 추가하여 해싱
  const salt = 'xivix_2026_salt';
  return await sha256(`${salt}_${apiKey}`);
}

/**
 * API 키 검증
 */
export async function verifyApiKey(
  providedKey: string,
  storedHash: string
): Promise<boolean> {
  const providedHash = await hashApiKey(providedKey);
  return providedHash === storedHash;
}
