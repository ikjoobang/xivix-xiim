/**
 * XIVIX XIIM - 네이버 검색 API 서비스
 * 보험 설계안 이미지 검색 및 타겟 URL 확보
 */

/** 네이버 이미지 검색 결과 아이템 */
interface NaverImageItem {
  title: string;
  link: string;           // 이미지 원본 URL
  thumbnail: string;      // 썸네일 URL
  sizeheight: string;
  sizewidth: string;
}

/** 네이버 블로그 검색 결과 아이템 */
interface NaverBlogItem {
  title: string;
  link: string;           // 블로그 포스트 URL
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
}

/** 네이버 API 검색 응답 */
interface NaverSearchResponse<T> {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: T[];
}

/** 검색 결과 타입 */
export interface SearchTarget {
  type: 'image' | 'blog';
  url: string;
  title: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

/**
 * 네이버 이미지 검색 API 호출
 */
export async function searchNaverImages(
  clientId: string,
  clientSecret: string,
  keyword: string,
  display: number = 10
): Promise<{ success: boolean; items?: SearchTarget[]; error?: string }> {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://openapi.naver.com/v1/search/image?query=${encodedKeyword}&display=${display}&sort=sim`;
    
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `네이버 이미지 검색 실패: ${response.status} - ${errorText}`
      };
    }
    
    const data: NaverSearchResponse<NaverImageItem> = await response.json();
    
    const items: SearchTarget[] = data.items.map(item => ({
      type: 'image' as const,
      url: item.link,
      title: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      thumbnail: item.thumbnail,
      width: parseInt(item.sizewidth) || undefined,
      height: parseInt(item.sizeheight) || undefined
    }));
    
    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      error: `네이버 API 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}

/**
 * 네이버 블로그 검색 API 호출
 */
export async function searchNaverBlogs(
  clientId: string,
  clientSecret: string,
  keyword: string,
  display: number = 10
): Promise<{ success: boolean; items?: SearchTarget[]; error?: string }> {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://openapi.naver.com/v1/search/blog?query=${encodedKeyword}&display=${display}&sort=sim`;
    
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `네이버 블로그 검색 실패: ${response.status} - ${errorText}`
      };
    }
    
    const data: NaverSearchResponse<NaverBlogItem> = await response.json();
    
    const items: SearchTarget[] = data.items.map(item => ({
      type: 'blog' as const,
      url: item.link,
      title: item.title.replace(/<[^>]*>/g, '') // HTML 태그 제거
    }));
    
    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      error: `네이버 API 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}

/**
 * 통합 검색: 이미지 + 블로그 결과 조합
 * 보험 설계안 타겟팅에 최적화
 */
export async function searchInsuranceContent(
  clientId: string,
  clientSecret: string,
  keyword: string,
  targetCompany?: string
): Promise<{ success: boolean; targets?: SearchTarget[]; error?: string }> {
  // 키워드 최적화
  let optimizedKeyword = keyword;
  
  // 보험사 한글명 매핑
  const companyNameMap: Record<string, string> = {
    'SAMSUNG_LIFE': '삼성생명',
    'HANWHA_LIFE': '한화생명',
    'KYOBO_LIFE': '교보생명',
    'NH_LIFE': 'NH농협생명',
    'SHINHAN_LIFE': '신한라이프',
    'MIRAE_LIFE': '미래에셋생명',
    'KB_LIFE': 'KB생명',
    'SAMSUNG_FIRE': '삼성화재',
    'HYUNDAI_MARINE': '현대해상',
    'DB_INSURANCE': 'DB손해보험',
    'KB_INSURANCE': 'KB손해보험',
    'MERITZ_FIRE': '메리츠화재'
  };
  
  // 보험사명 추가
  if (targetCompany && companyNameMap[targetCompany]) {
    if (!keyword.includes(companyNameMap[targetCompany])) {
      optimizedKeyword = `${companyNameMap[targetCompany]} ${keyword}`;
    }
  }
  
  // 설계안/보장분석 키워드 추가
  if (!keyword.includes('설계안') && !keyword.includes('보장분석')) {
    optimizedKeyword += ' 설계안';
  }
  
  console.log(`[네이버 검색] 최적화된 키워드: "${optimizedKeyword}"`);
  
  // 이미지 검색 실행
  const imageResult = await searchNaverImages(clientId, clientSecret, optimizedKeyword, 10);
  
  // 블로그 검색도 병행 (이미지가 없을 경우 대비)
  const blogResult = await searchNaverBlogs(clientId, clientSecret, optimizedKeyword, 5);
  
  const allTargets: SearchTarget[] = [];
  
  // 이미지 결과 추가 (우선순위 높음)
  if (imageResult.success && imageResult.items) {
    allTargets.push(...imageResult.items);
  }
  
  // 블로그 결과 추가
  if (blogResult.success && blogResult.items) {
    allTargets.push(...blogResult.items);
  }
  
  if (allTargets.length === 0) {
    return {
      success: false,
      error: imageResult.error || blogResult.error || '검색 결과가 없습니다'
    };
  }
  
  return { success: true, targets: allTargets };
}

/**
 * 랜덤 타겟 선택
 * 중복 방지를 위해 매번 다른 원본 선택
 */
export function selectRandomTarget(targets: SearchTarget[]): SearchTarget {
  const index = Math.floor(Math.random() * targets.length);
  return targets[index];
}

/**
 * 이미지 타겟만 필터링
 */
export function filterImageTargets(targets: SearchTarget[]): SearchTarget[] {
  return targets.filter(t => t.type === 'image');
}

/**
 * 고화질 이미지만 필터링 (최소 크기 기준)
 */
export function filterHighQualityImages(
  targets: SearchTarget[],
  minWidth: number = 400,
  minHeight: number = 300
): SearchTarget[] {
  return targets.filter(t => {
    if (t.type !== 'image') return false;
    if (!t.width || !t.height) return true; // 크기 정보 없으면 포함
    return t.width >= minWidth && t.height >= minHeight;
  });
}
