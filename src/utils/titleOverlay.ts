/**
 * XIVIX XIIM - 동적 타이틀 합성 유틸리티
 * 
 * 사용자 키워드를 정제하여 이미지 상단에 합성될 타이틀 생성
 * Cloudinary Text Overlay 파라미터로 변환
 * 
 * @example
 * "30대 워킹맘을 위한 삼성생명 암보험 추천해줘" → "[30대 워킹맘 삼성생명 맞춤안]"
 */

/**
 * 1. 키워드 정제 함수: 긴 질문을 간결한 타이틀로 요약
 * 
 * @param keyword - 사용자 입력 키워드
 * @returns 정제된 타이틀 문자열
 * 
 * @example
 * generateDynamicTitle("30대 워킹맘을 위한 삼성생명 암보험 추천해줘")
 * // → "[30대 워킹맘 삼성생명 맞춤안]"
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
    .replace(/\s+/g, " ") // 다중 공백 제거
    .trim();

  // 너무 길면 잘라서 '..' 처리 (Cloudinary URL 길이 제한 고려)
  if (cleanKeyword.length > 20) {
    cleanKeyword = cleanKeyword.substring(0, 19) + "..";
  }

  // 빈 문자열 체크
  if (cleanKeyword.length === 0) {
    return "맞춤 설계안 예시";
  }

  return `[${cleanKeyword} 맞춤안]`;
}

/**
 * 2. Cloudinary 오버레이 파라미터 생성 함수
 * 
 * 한글 폰트(Noto Sans KR), 흰색 글씨, 검은색 반투명 배경 박스 적용
 * 
 * @param title - 정제된 타이틀 문자열
 * @returns Cloudinary URL 변환 파라미터 문자열
 * 
 * Cloudinary 변환 파라미터 설명:
 * - l_text:폰트_크기_스타일:내용 (레이어 텍스트 추가)
 * - co_white (글자색 흰색)
 * - b_rgb:000000_o_70 (배경색 검정, 투명도 70%)
 * - bo_3px_solid_rgb:333333 (테두리)
 * - g_north (위치: 상단 중앙 정렬)
 * - y_30 (상단에서 30px 아래로 띄움)
 * 
 * @example
 * getTitleOverlayParams("[30대 워킹맘 삼성생명 맞춤안]")
 * // → "l_text:NotoSansKR-Bold.otf_40_bold:...,co_white,b_rgb:000000_o_70,g_north,y_30"
 */
export function getTitleOverlayParams(title: string): string {
  // 한글 깨짐 방지를 위한 URL 인코딩
  // Cloudinary는 특수문자 처리가 까다로움
  const encodedTitle = encodeURIComponent(title)
    .replace(/%5B/g, '[')  // [ 유지
    .replace(/%5D/g, ']')  // ] 유지
    .replace(/%20/g, '%20'); // 공백은 %20으로 유지

  // Cloudinary 변환 파라미터 조합
  // NotoSansKR-Bold.otf 폰트 사용 (Cloudflare/Cloudinary 호스팅)
  const overlayParams = [
    `l_text:NotoSansKR-Bold.otf_40_bold:${encodedTitle}`,
    'co_white',
    'b_rgb:1a1a2e_80',  // 진한 네이비 배경, 80% 투명도
    'bo_2px_solid_rgb:4a90d9',  // 파란색 테두리
    'g_north',  // 상단 중앙
    'y_25'  // 상단에서 25px
  ].join(',');

  // fl_layer_apply로 레이어 적용
  return `${overlayParams}/fl_layer_apply`;
}

/**
 * 3. 전체 타이틀 오버레이 변환 문자열 생성
 * 
 * @param keyword - 원본 키워드
 * @returns Cloudinary URL에 삽입할 전체 변환 문자열
 */
export function buildTitleOverlayTransform(keyword: string | undefined): string {
  const title = generateDynamicTitle(keyword);
  return getTitleOverlayParams(title);
}

/**
 * 4. 보험사 + 상품 타입 기반 타이틀 생성
 * 
 * R2 폴백 시 사용되는 보다 정형화된 타이틀 생성
 * 
 * @param companyNameKo - 보험사 한글명
 * @param productCategory - 상품 카테고리 (cancer, whole_life, driver 등)
 * @returns 정형화된 타이틀
 */
export function generateCompanyProductTitle(
  companyNameKo: string,
  productCategory: string
): string {
  // 카테고리별 한글 라벨
  const categoryLabels: Record<string, string> = {
    'universal': '종합보험',
    'cancer': '암보험',
    'whole_life': '종신보험',
    'term_life': '정기보험',
    'child': '어린이보험',
    'driver': '운전자보험',
    'pension': '연금보험',
    'health': '건강보험',
    'accident': '상해보험',
    'real_loss': '실손보험',
    'savings': '저축보험',
    'variable': '변액보험',
    'fire': '화재보험',
    'dental': '치아보험',
    'prenatal': '태아보험'
  };

  const productLabel = categoryLabels[productCategory] || '맞춤보험';
  
  return `[${companyNameKo} ${productLabel} 설계안]`;
}

/**
 * 5. 타이틀 유효성 검사
 * 
 * @param title - 검사할 타이틀
 * @returns 유효성 여부
 */
export function isValidTitle(title: string): boolean {
  // 최소 3자 이상, 최대 50자 이하
  if (title.length < 3 || title.length > 50) return false;
  
  // 금지 문자 체크 (Cloudinary URL에 문제 일으킬 수 있는 문자)
  const forbiddenChars = /[<>'"\\`]/;
  if (forbiddenChars.test(title)) return false;
  
  return true;
}

/**
 * 6. Cloudinary URL에 타이틀 오버레이 삽입
 * 
 * 기존 Cloudinary URL에 타이틀 오버레이 변환을 추가
 * 
 * @param baseUrl - 기존 Cloudinary URL
 * @param keyword - 키워드 (타이틀 생성용)
 * @returns 타이틀이 합성된 새 URL
 */
export function insertTitleOverlayToUrl(
  baseUrl: string,
  keyword: string | undefined
): string {
  if (!keyword) return baseUrl;
  
  const titleOverlay = buildTitleOverlayTransform(keyword);
  
  // Cloudinary URL 구조: .../upload/변환들/public_id
  // 마스킹 변환 뒤에 타이틀 오버레이 추가
  
  // /upload/ 다음에 변환 파라미터가 있는지 확인
  const uploadIndex = baseUrl.indexOf('/upload/');
  if (uploadIndex === -1) return baseUrl;
  
  const beforeUpload = baseUrl.substring(0, uploadIndex + 8); // '/upload/' 포함
  const afterUpload = baseUrl.substring(uploadIndex + 8);
  
  // public_id 찾기 (마지막 / 이후)
  const lastSlashIndex = afterUpload.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    // 변환 없이 바로 public_id인 경우
    return `${beforeUpload}${titleOverlay}/${afterUpload}`;
  }
  
  const transformations = afterUpload.substring(0, lastSlashIndex);
  const publicId = afterUpload.substring(lastSlashIndex + 1);
  
  // 기존 변환 + 타이틀 오버레이 + public_id
  return `${beforeUpload}${transformations}/${titleOverlay}/${publicId}`;
}
