/**
 * XIVIX XIIM - 네이버 검색 API 서비스
 * 보험 설계안 이미지 검색 및 타겟 URL 확보
 * 
 * 핵심: 광고/뉴스/홍보 이미지 제외, 실제 설계안/보장분석표만 수집
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
  score?: number; // 설계안 관련도 점수
}

// ============================================
// 광고/뉴스 제외 키워드 (강화)
// ============================================
const EXCLUDE_KEYWORDS = [
  // 뉴스/언론
  '뉴스', '기자', '보도', '출시', '론칭', '선봬', '발표', '기사',
  '머니투데이', '한경', '조선', '중앙', '동아', '매일경제', '헤럴드',
  '연합뉴스', '뉴시스', 'SBS', 'KBS', 'MBC', 'JTBC',
  // 광고/홍보
  '광고', '홍보', 'PR', '이벤트', '캠페인', '프로모션', '할인',
  // 건물/외관
  '본사', '사옥', '건물', '빌딩', '외관', '전경', '입구', '사진',
  // 캐릭터/마스코트
  '캐릭터', '마스코트', '귀여운', '일러스트',
  // 사람/인물
  '단체', '직원', '임원', '대표', 'CEO', '사장', '회장',
  '행사', '시상', '수상', '포럼', '세미나', '컨퍼런스',
  // 주식/금융
  '주가', '주식', '거래량', '시세', '차트', '코스피', '코스닥',
  // 기타
  '채용', '인재', '취업', '공채', '면접', '로고', '심볼'
];

// ============================================
// 설계안 포함 키워드 (점수화)
// ============================================
const DESIGN_KEYWORDS: Record<string, number> = {
  // 고득점 (실제 설계안 가능성 높음)
  '설계서': 10,
  '가입설계서': 10,
  '보장분석': 10,
  '보장분석표': 10,
  '보장내역': 9,
  '보험료': 8,
  '월납': 8,
  '일시납': 8,
  '특약': 8,
  '주계약': 8,
  '보험금': 7,
  '만기': 7,
  '납입기간': 7,
  '보험기간': 7,
  '피보험자': 9,
  '계약자': 9,
  '수익자': 8,
  '증권번호': 10,
  '증권': 7,
  '보험증권': 9,
  
  // 중득점
  '설계사': 6,
  '컨설팅': 5,
  '상담': 5,
  '비교': 5,
  '추천': 4,
  '리뷰': 4,
  '후기': 4,
  '가입': 5,
  
  // 저득점 (일반적)
  '보험': 2,
  '생명': 2,
  '손해': 2
};

/**
 * 타이틀/설명에서 설계안 관련도 점수 계산
 */
function calculateDesignScore(text: string): number {
  const lowerText = text.toLowerCase();
  let score = 0;
  
  // 제외 키워드가 있으면 -100
  for (const kw of EXCLUDE_KEYWORDS) {
    if (lowerText.includes(kw.toLowerCase())) {
      return -100;
    }
  }
  
  // 설계안 키워드 점수 합산
  for (const [kw, points] of Object.entries(DESIGN_KEYWORDS)) {
    if (text.includes(kw)) {
      score += points;
    }
  }
  
  return score;
}

/**
 * 네이버 이미지 검색 API 호출
 */
export async function searchNaverImages(
  clientId: string,
  clientSecret: string,
  keyword: string,
  display: number = 20
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
    
    const items: SearchTarget[] = data.items.map(item => {
      const title = item.title.replace(/<[^>]*>/g, '');
      return {
        type: 'image' as const,
        url: item.link,
        title,
        thumbnail: item.thumbnail,
        width: parseInt(item.sizewidth) || undefined,
        height: parseInt(item.sizeheight) || undefined,
        score: calculateDesignScore(title)
      };
    });
    
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
  display: number = 20
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
    
    const items: SearchTarget[] = data.items.map(item => {
      const title = item.title.replace(/<[^>]*>/g, '');
      const description = item.description.replace(/<[^>]*>/g, '');
      const combinedText = `${title} ${description}`;
      return {
        type: 'blog' as const,
        url: item.link,
        title,
        score: calculateDesignScore(combinedText)
      };
    });
    
    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      error: `네이버 API 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}

/**
 * 보험사 한글명 매핑 (전체 31개사)
 */
const COMPANY_NAME_MAP: Record<string, string> = {
  // 생명보험 19개
  'SAMSUNG_LIFE': '삼성생명',
  'HANWHA_LIFE': '한화생명',
  'KYOBO_LIFE': '교보생명',
  'NH_LIFE': 'NH농협생명',
  'SHINHAN_LIFE': '신한라이프',
  'MIRAE_LIFE': '미래에셋생명',
  'KB_LIFE': 'KB라이프생명',
  'AIA': 'AIA생명',
  'METLIFE': '메트라이프생명',
  'PRUDENTIAL': '푸르덴셜생명',
  'LINA': '라이나생명',
  'DB_LIFE': 'DB생명',
  'DONGYANG_LIFE': '동양생명',
  'ABL_LIFE': 'ABL생명',
  'CHUBB_LIFE': '처브라이프생명',
  'KDB_LIFE': 'KDB생명',
  'IBK_LIFE': 'IBK연금보험',
  'HANA_LIFE': '하나생명',
  'HEUNGKUK_LIFE': '흥국생명',
  // 손해보험 12개
  'SAMSUNG_FIRE': '삼성화재',
  'HYUNDAI_MARINE': '현대해상',
  'DB_INSURANCE': 'DB손해보험',
  'KB_INSURANCE': 'KB손해보험',
  'MERITZ_FIRE': '메리츠화재',
  'HANWHA_GENERAL': '한화손해보험',
  'NH_INSURANCE': 'NH농협손해보험',
  'LOTTE_INSURANCE': '롯데손해보험',
  'MG_INSURANCE': 'MG손해보험',
  'HEUNGKUK_FIRE': '흥국화재',
  'AXA_GENERAL': 'AXA손해보험',
  'CHUBB_GENERAL': '처브손해보험'
};

/**
 * 통합 검색: 실제 설계안/보장분석표만 타겟팅
 * 광고/뉴스/건물사진 등 제외
 */
export async function searchInsuranceContent(
  clientId: string,
  clientSecret: string,
  keyword: string,
  targetCompany?: string
): Promise<{ success: boolean; targets?: SearchTarget[]; error?: string }> {
  
  // 회사명 추출
  const companyName = targetCompany && COMPANY_NAME_MAP[targetCompany] 
    ? COMPANY_NAME_MAP[targetCompany] 
    : '';
  
  // 설계안 특화 검색 키워드 조합 (다양하게)
  const searchVariants = [
    `${companyName} 가입설계서 보장내역`,
    `${companyName} 보장분석표 보험료`,
    `${companyName} 설계서 월납보험료`,
    `${companyName} 보험증권 보장내역`,
    `${companyName} 특약 보장분석`
  ];
  
  // 랜덤하게 검색 키워드 선택
  const randomIndex = Math.floor(Math.random() * searchVariants.length);
  const optimizedKeyword = searchVariants[randomIndex];
  
  console.log(`[네이버 검색] 최적화된 키워드: "${optimizedKeyword}"`);
  
  // 블로그와 이미지 동시 검색
  const [blogResult, imageResult] = await Promise.all([
    searchNaverBlogs(clientId, clientSecret, optimizedKeyword, 20),
    searchNaverImages(clientId, clientSecret, optimizedKeyword, 20)
  ]);
  
  const allTargets: SearchTarget[] = [];
  
  // 블로그 결과 추가 (점수 양수만)
  if (blogResult.success && blogResult.items) {
    const validBlogs = blogResult.items.filter(item => (item.score || 0) > 0);
    allTargets.push(...validBlogs);
  }
  
  // 이미지 결과 추가 (점수 양수만)
  if (imageResult.success && imageResult.items) {
    const validImages = imageResult.items.filter(item => (item.score || 0) > 0);
    allTargets.push(...validImages);
  }
  
  // 점수순 정렬 (높은 점수 우선)
  allTargets.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  console.log(`[네이버 검색] 필터링 후 ${allTargets.length}개 타겟 (상위 5개 점수: ${allTargets.slice(0, 5).map(t => t.score).join(', ')})`);
  
  if (allTargets.length === 0) {
    // 점수 양수 결과가 없으면 원본 키워드로 재검색
    console.log(`[네이버 검색] 필터링 결과 없음, 원본 키워드로 재검색: "${keyword}"`);
    
    const fallbackResult = await searchNaverImages(clientId, clientSecret, `${companyName} ${keyword}`, 10);
    if (fallbackResult.success && fallbackResult.items) {
      // 제외 키워드만 필터링 (점수 무시)
      const fallbackTargets = fallbackResult.items.filter(item => (item.score || 0) >= 0);
      if (fallbackTargets.length > 0) {
        return { success: true, targets: fallbackTargets };
      }
    }
    
    return {
      success: false,
      error: '설계안 관련 이미지를 찾을 수 없습니다. 키워드를 더 구체적으로 입력해주세요.'
    };
  }
  
  return { success: true, targets: allTargets };
}

/**
 * 상위 점수 타겟 중 랜덤 선택
 * 중복 방지를 위해 상위 5개 중에서 랜덤 선택
 */
export function selectRandomTarget(targets: SearchTarget[]): SearchTarget {
  // 상위 5개 중 랜덤
  const topN = Math.min(5, targets.length);
  const index = Math.floor(Math.random() * topN);
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
  minWidth: number = 600,
  minHeight: number = 400
): SearchTarget[] {
  return targets.filter(t => {
    if (t.type !== 'image') return false;
    if (!t.width || !t.height) return true; // 크기 정보 없으면 포함
    return t.width >= minWidth && t.height >= minHeight;
  });
}
