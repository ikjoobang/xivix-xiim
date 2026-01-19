/**
 * XIVIX XIIM - R2 표준 샘플 폴백 시스템
 * 
 * 시각적 맥락 동기화(Visual Relevance) 전략:
 * - 보험사 로고 매칭 + 상품군(암, 종신, 운전자 등) 최적화 샘플 호출
 * - 카테고리 기반 정밀 매칭 (Product-Match)
 * - 우선순위: {company}_{category}.png → {company}_universal.png
 * 
 * R2 경로 구조: samples/{life|nonlife}/{company}/{category}.png
 */

import type { Env } from '../types';

/** 보험사 샘플 정보 */
export interface InsuranceSample {
  company_code: string;
  company_name_ko: string;
  category: 'LIFE' | 'NON_LIFE';
  sample_key: string;  // R2 키
  product_type: string; // 상품 유형 (종신, 암, 어린이 등)
  product_category: string; // 카테고리 코드 (universal, cancer, child, driver, pension)
}

/**
 * 5대 핵심 카테고리 정의
 * - 모든 보험사가 공통으로 지원해야 하는 카테고리
 */
export const CORE_CATEGORIES = {
  // 생명보험 핵심 카테고리
  LIFE: ['universal', 'cancer', 'whole_life', 'pension', 'child'],
  // 손해보험 핵심 카테고리
  NON_LIFE: ['driver', 'child', 'health', 'accident', 'universal']
} as const;

/**
 * 상품 키워드 → 카테고리 코드 매핑
 * 시각적 맥락 동기화의 핵심 - 질문의 상품군에 맞는 샘플 선택
 */
export const PRODUCT_TO_CATEGORY: Record<string, { category: string; priority: number }[]> = {
  // 암/뇌/심장 관련
  '암': [{ category: 'cancer', priority: 1 }],
  '암보험': [{ category: 'cancer', priority: 1 }],
  '뇌': [{ category: 'cancer', priority: 1 }, { category: 'health', priority: 2 }],
  '심장': [{ category: 'cancer', priority: 1 }, { category: 'health', priority: 2 }],
  '3대질병': [{ category: 'cancer', priority: 1 }],
  '중대질병': [{ category: 'cancer', priority: 1 }],
  
  // 종신/정기/사망 관련
  '종신': [{ category: 'whole_life', priority: 1 }, { category: 'universal', priority: 2 }],
  '종신보험': [{ category: 'whole_life', priority: 1 }, { category: 'universal', priority: 2 }],
  '정기': [{ category: 'term_life', priority: 1 }, { category: 'universal', priority: 2 }],
  '정기보험': [{ category: 'term_life', priority: 1 }, { category: 'universal', priority: 2 }],
  '사망': [{ category: 'whole_life', priority: 1 }, { category: 'universal', priority: 2 }],
  '상속': [{ category: 'whole_life', priority: 1 }],
  
  // 어린이/태아 관련
  '어린이': [{ category: 'child', priority: 1 }],
  '어린이보험': [{ category: 'child', priority: 1 }],
  '자녀': [{ category: 'child', priority: 1 }],
  '태아': [{ category: 'child', priority: 1 }, { category: 'prenatal', priority: 2 }],
  '태아보험': [{ category: 'child', priority: 1 }, { category: 'prenatal', priority: 2 }],
  
  // 운전자/상해 관련
  '운전자': [{ category: 'driver', priority: 1 }],
  '운전자보험': [{ category: 'driver', priority: 1 }],
  '상해': [{ category: 'accident', priority: 1 }, { category: 'driver', priority: 2 }],
  '상해보험': [{ category: 'accident', priority: 1 }],
  '12대중과실': [{ category: 'driver', priority: 1 }],
  '변호사': [{ category: 'driver', priority: 1 }],
  
  // 저축/연금 관련
  '연금': [{ category: 'pension', priority: 1 }],
  '연금보험': [{ category: 'pension', priority: 1 }],
  '저축': [{ category: 'savings', priority: 1 }, { category: 'pension', priority: 2 }],
  '저축보험': [{ category: 'savings', priority: 1 }, { category: 'pension', priority: 2 }],
  '비과세': [{ category: 'savings', priority: 1 }, { category: 'pension', priority: 2 }],
  '노후': [{ category: 'pension', priority: 1 }],
  
  // 건강/실손 관련
  '건강': [{ category: 'health', priority: 1 }],
  '건강보험': [{ category: 'health', priority: 1 }],
  '실손': [{ category: 'real_loss', priority: 1 }, { category: 'health', priority: 2 }],
  '실비': [{ category: 'real_loss', priority: 1 }, { category: 'health', priority: 2 }],
  '실손보험': [{ category: 'real_loss', priority: 1 }, { category: 'health', priority: 2 }],
  
  // 화재 관련
  '화재': [{ category: 'fire', priority: 1 }],
  '화재보험': [{ category: 'fire', priority: 1 }],
  
  // 치아 관련
  '치아': [{ category: 'dental', priority: 1 }],
  '치아보험': [{ category: 'dental', priority: 1 }],
  
  // 변액 관련
  '변액': [{ category: 'variable', priority: 1 }, { category: 'pension', priority: 2 }],
  '변액보험': [{ category: 'variable', priority: 1 }]
};

/**
 * 31개 보험사 표준 샘플 매핑
 * R2 경로: samples/{life|nonlife}/{company_short}/{category}.png
 */
export const INSURANCE_SAMPLES: Record<string, InsuranceSample[]> = {
  // ============================================
  // 생명보험사 (19개)
  // ============================================
  'SAMSUNG_LIFE': [
    { company_code: 'SAMSUNG_LIFE', company_name_ko: '삼성생명', category: 'LIFE', sample_key: 'samples/life/samsung/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'SAMSUNG_LIFE', company_name_ko: '삼성생명', category: 'LIFE', sample_key: 'samples/life/samsung/cancer.png', product_type: '암보험', product_category: 'cancer' },
    { company_code: 'SAMSUNG_LIFE', company_name_ko: '삼성생명', category: 'LIFE', sample_key: 'samples/life/samsung/whole_life.png', product_type: '종신보험', product_category: 'whole_life' },
    { company_code: 'SAMSUNG_LIFE', company_name_ko: '삼성생명', category: 'LIFE', sample_key: 'samples/life/samsung/pension.png', product_type: '연금보험', product_category: 'pension' },
    { company_code: 'SAMSUNG_LIFE', company_name_ko: '삼성생명', category: 'LIFE', sample_key: 'samples/life/samsung/child.png', product_type: '어린이보험', product_category: 'child' }
  ],
  'HANWHA_LIFE': [
    { company_code: 'HANWHA_LIFE', company_name_ko: '한화생명', category: 'LIFE', sample_key: 'samples/life/hanwha/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'HANWHA_LIFE', company_name_ko: '한화생명', category: 'LIFE', sample_key: 'samples/life/hanwha/cancer.png', product_type: '암보험', product_category: 'cancer' },
    { company_code: 'HANWHA_LIFE', company_name_ko: '한화생명', category: 'LIFE', sample_key: 'samples/life/hanwha/whole_life.png', product_type: '종신보험', product_category: 'whole_life' },
    { company_code: 'HANWHA_LIFE', company_name_ko: '한화생명', category: 'LIFE', sample_key: 'samples/life/hanwha/pension.png', product_type: '연금보험', product_category: 'pension' },
    { company_code: 'HANWHA_LIFE', company_name_ko: '한화생명', category: 'LIFE', sample_key: 'samples/life/hanwha/child.png', product_type: '어린이보험', product_category: 'child' }
  ],
  'KYOBO_LIFE': [
    { company_code: 'KYOBO_LIFE', company_name_ko: '교보생명', category: 'LIFE', sample_key: 'samples/life/kyobo/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'KYOBO_LIFE', company_name_ko: '교보생명', category: 'LIFE', sample_key: 'samples/life/kyobo/cancer.png', product_type: '암보험', product_category: 'cancer' },
    { company_code: 'KYOBO_LIFE', company_name_ko: '교보생명', category: 'LIFE', sample_key: 'samples/life/kyobo/whole_life.png', product_type: '종신보험', product_category: 'whole_life' },
    { company_code: 'KYOBO_LIFE', company_name_ko: '교보생명', category: 'LIFE', sample_key: 'samples/life/kyobo/pension.png', product_type: '연금보험', product_category: 'pension' },
    { company_code: 'KYOBO_LIFE', company_name_ko: '교보생명', category: 'LIFE', sample_key: 'samples/life/kyobo/child.png', product_type: '어린이보험', product_category: 'child' }
  ],
  'NH_LIFE': [
    { company_code: 'NH_LIFE', company_name_ko: 'NH농협생명', category: 'LIFE', sample_key: 'samples/life/nh/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'NH_LIFE', company_name_ko: 'NH농협생명', category: 'LIFE', sample_key: 'samples/life/nh/cancer.png', product_type: '암보험', product_category: 'cancer' },
    { company_code: 'NH_LIFE', company_name_ko: 'NH농협생명', category: 'LIFE', sample_key: 'samples/life/nh/pension.png', product_type: '연금보험', product_category: 'pension' }
  ],
  'SHINHAN_LIFE': [
    { company_code: 'SHINHAN_LIFE', company_name_ko: '신한라이프', category: 'LIFE', sample_key: 'samples/life/shinhan/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'SHINHAN_LIFE', company_name_ko: '신한라이프', category: 'LIFE', sample_key: 'samples/life/shinhan/cancer.png', product_type: '암보험', product_category: 'cancer' },
    { company_code: 'SHINHAN_LIFE', company_name_ko: '신한라이프', category: 'LIFE', sample_key: 'samples/life/shinhan/pension.png', product_type: '연금보험', product_category: 'pension' }
  ],
  'MIRAE_LIFE': [
    { company_code: 'MIRAE_LIFE', company_name_ko: '미래에셋생명', category: 'LIFE', sample_key: 'samples/life/mirae/universal.png', product_type: '변액보험', product_category: 'universal' },
    { company_code: 'MIRAE_LIFE', company_name_ko: '미래에셋생명', category: 'LIFE', sample_key: 'samples/life/mirae/variable.png', product_type: '변액보험', product_category: 'variable' },
    { company_code: 'MIRAE_LIFE', company_name_ko: '미래에셋생명', category: 'LIFE', sample_key: 'samples/life/mirae/pension.png', product_type: '연금보험', product_category: 'pension' }
  ],
  'KB_LIFE': [
    { company_code: 'KB_LIFE', company_name_ko: 'KB라이프생명', category: 'LIFE', sample_key: 'samples/life/kb/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'KB_LIFE', company_name_ko: 'KB라이프생명', category: 'LIFE', sample_key: 'samples/life/kb/cancer.png', product_type: '암보험', product_category: 'cancer' },
    { company_code: 'KB_LIFE', company_name_ko: 'KB라이프생명', category: 'LIFE', sample_key: 'samples/life/kb/pension.png', product_type: '연금보험', product_category: 'pension' }
  ],
  'AIA': [
    { company_code: 'AIA', company_name_ko: 'AIA생명', category: 'LIFE', sample_key: 'samples/life/aia/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'AIA', company_name_ko: 'AIA생명', category: 'LIFE', sample_key: 'samples/life/aia/cancer.png', product_type: '암보험', product_category: 'cancer' },
    { company_code: 'AIA', company_name_ko: 'AIA생명', category: 'LIFE', sample_key: 'samples/life/aia/whole_life.png', product_type: '종신보험', product_category: 'whole_life' }
  ],
  'METLIFE': [
    { company_code: 'METLIFE', company_name_ko: '메트라이프생명', category: 'LIFE', sample_key: 'samples/life/metlife/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'METLIFE', company_name_ko: '메트라이프생명', category: 'LIFE', sample_key: 'samples/life/metlife/cancer.png', product_type: '암보험', product_category: 'cancer' }
  ],
  'PRUDENTIAL': [
    { company_code: 'PRUDENTIAL', company_name_ko: '푸르덴셜생명', category: 'LIFE', sample_key: 'samples/life/prudential/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'PRUDENTIAL', company_name_ko: '푸르덴셜생명', category: 'LIFE', sample_key: 'samples/life/prudential/whole_life.png', product_type: '종신보험', product_category: 'whole_life' }
  ],
  'LINA': [
    { company_code: 'LINA', company_name_ko: '라이나생명', category: 'LIFE', sample_key: 'samples/life/lina/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'LINA', company_name_ko: '라이나생명', category: 'LIFE', sample_key: 'samples/life/lina/cancer.png', product_type: '암보험', product_category: 'cancer' }
  ],
  'DB_LIFE': [
    { company_code: 'DB_LIFE', company_name_ko: 'DB생명', category: 'LIFE', sample_key: 'samples/life/db/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'DB_LIFE', company_name_ko: 'DB생명', category: 'LIFE', sample_key: 'samples/life/db/cancer.png', product_type: '암보험', product_category: 'cancer' }
  ],
  'DONGYANG_LIFE': [
    { company_code: 'DONGYANG_LIFE', company_name_ko: '동양생명', category: 'LIFE', sample_key: 'samples/life/dongyang/universal.png', product_type: '종신보험', product_category: 'universal' },
    { company_code: 'DONGYANG_LIFE', company_name_ko: '동양생명', category: 'LIFE', sample_key: 'samples/life/dongyang/cancer.png', product_type: '암보험', product_category: 'cancer' }
  ],
  'ABL_LIFE': [
    { company_code: 'ABL_LIFE', company_name_ko: 'ABL생명', category: 'LIFE', sample_key: 'samples/life/abl/universal.png', product_type: '종신보험', product_category: 'universal' }
  ],
  'CHUBB_LIFE': [
    { company_code: 'CHUBB_LIFE', company_name_ko: '처브라이프생명', category: 'LIFE', sample_key: 'samples/life/chubb/universal.png', product_type: '종신보험', product_category: 'universal' }
  ],
  'KDB_LIFE': [
    { company_code: 'KDB_LIFE', company_name_ko: 'KDB생명', category: 'LIFE', sample_key: 'samples/life/kdb/universal.png', product_type: '종신보험', product_category: 'universal' }
  ],
  'IBK_LIFE': [
    { company_code: 'IBK_LIFE', company_name_ko: 'IBK연금보험', category: 'LIFE', sample_key: 'samples/life/ibk/universal.png', product_type: '연금보험', product_category: 'universal' },
    { company_code: 'IBK_LIFE', company_name_ko: 'IBK연금보험', category: 'LIFE', sample_key: 'samples/life/ibk/pension.png', product_type: '연금보험', product_category: 'pension' }
  ],
  'HANA_LIFE': [
    { company_code: 'HANA_LIFE', company_name_ko: '하나생명', category: 'LIFE', sample_key: 'samples/life/hana/universal.png', product_type: '종신보험', product_category: 'universal' }
  ],
  'HEUNGKUK_LIFE': [
    { company_code: 'HEUNGKUK_LIFE', company_name_ko: '흥국생명', category: 'LIFE', sample_key: 'samples/life/heungkuk/universal.png', product_type: '종신보험', product_category: 'universal' }
  ],
  
  // ============================================
  // 손해보험사 (12개)
  // ============================================
  'SAMSUNG_FIRE': [
    { company_code: 'SAMSUNG_FIRE', company_name_ko: '삼성화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/samsung/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'SAMSUNG_FIRE', company_name_ko: '삼성화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/samsung/driver.png', product_type: '운전자보험', product_category: 'driver' },
    { company_code: 'SAMSUNG_FIRE', company_name_ko: '삼성화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/samsung/child.png', product_type: '어린이보험', product_category: 'child' },
    { company_code: 'SAMSUNG_FIRE', company_name_ko: '삼성화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/samsung/health.png', product_type: '건강보험', product_category: 'health' },
    { company_code: 'SAMSUNG_FIRE', company_name_ko: '삼성화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/samsung/accident.png', product_type: '상해보험', product_category: 'accident' }
  ],
  'HYUNDAI_MARINE': [
    { company_code: 'HYUNDAI_MARINE', company_name_ko: '현대해상', category: 'NON_LIFE', sample_key: 'samples/nonlife/hyundai/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'HYUNDAI_MARINE', company_name_ko: '현대해상', category: 'NON_LIFE', sample_key: 'samples/nonlife/hyundai/child.png', product_type: '어린이보험', product_category: 'child' },
    { company_code: 'HYUNDAI_MARINE', company_name_ko: '현대해상', category: 'NON_LIFE', sample_key: 'samples/nonlife/hyundai/driver.png', product_type: '운전자보험', product_category: 'driver' },
    { company_code: 'HYUNDAI_MARINE', company_name_ko: '현대해상', category: 'NON_LIFE', sample_key: 'samples/nonlife/hyundai/health.png', product_type: '건강보험', product_category: 'health' }
  ],
  'DB_INSURANCE': [
    { company_code: 'DB_INSURANCE', company_name_ko: 'DB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/db/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'DB_INSURANCE', company_name_ko: 'DB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/db/driver.png', product_type: '운전자보험', product_category: 'driver' },
    { company_code: 'DB_INSURANCE', company_name_ko: 'DB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/db/child.png', product_type: '어린이보험', product_category: 'child' }
  ],
  'KB_INSURANCE': [
    { company_code: 'KB_INSURANCE', company_name_ko: 'KB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/kb/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'KB_INSURANCE', company_name_ko: 'KB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/kb/child.png', product_type: '어린이보험', product_category: 'child' },
    { company_code: 'KB_INSURANCE', company_name_ko: 'KB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/kb/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ],
  'MERITZ_FIRE': [
    { company_code: 'MERITZ_FIRE', company_name_ko: '메리츠화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/meritz/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'MERITZ_FIRE', company_name_ko: '메리츠화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/meritz/driver.png', product_type: '운전자보험', product_category: 'driver' },
    { company_code: 'MERITZ_FIRE', company_name_ko: '메리츠화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/meritz/child.png', product_type: '어린이보험', product_category: 'child' }
  ],
  'HANWHA_GENERAL': [
    { company_code: 'HANWHA_GENERAL', company_name_ko: '한화손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/hanwha/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'HANWHA_GENERAL', company_name_ko: '한화손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/hanwha/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ],
  'NH_INSURANCE': [
    { company_code: 'NH_INSURANCE', company_name_ko: 'NH농협손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/nh/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'NH_INSURANCE', company_name_ko: 'NH농협손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/nh/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ],
  'LOTTE_INSURANCE': [
    { company_code: 'LOTTE_INSURANCE', company_name_ko: '롯데손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/lotte/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'LOTTE_INSURANCE', company_name_ko: '롯데손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/lotte/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ],
  'MG_INSURANCE': [
    { company_code: 'MG_INSURANCE', company_name_ko: 'MG손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/mg/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'MG_INSURANCE', company_name_ko: 'MG손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/mg/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ],
  'HEUNGKUK_FIRE': [
    { company_code: 'HEUNGKUK_FIRE', company_name_ko: '흥국화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/heungkuk/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'HEUNGKUK_FIRE', company_name_ko: '흥국화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/heungkuk/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ],
  'AXA_GENERAL': [
    { company_code: 'AXA_GENERAL', company_name_ko: 'AXA손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/axa/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'AXA_GENERAL', company_name_ko: 'AXA손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/axa/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ],
  'CHUBB_GENERAL': [
    { company_code: 'CHUBB_GENERAL', company_name_ko: '처브손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/chubb/universal.png', product_type: '종합보험', product_category: 'universal' },
    { company_code: 'CHUBB_GENERAL', company_name_ko: '처브손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/chubb/driver.png', product_type: '운전자보험', product_category: 'driver' }
  ]
};

/**
 * 키워드에서 카테고리 코드 추출 (우선순위 포함)
 * 
 * @param keyword - 검색 키워드
 * @returns 카테고리 코드 배열 (우선순위 순)
 */
export function extractCategoryFromKeyword(keyword: string): string[] {
  const keywordLower = keyword.toLowerCase();
  const categories: { category: string; priority: number }[] = [];
  
  for (const [productKey, categoryMappings] of Object.entries(PRODUCT_TO_CATEGORY)) {
    if (keywordLower.includes(productKey.toLowerCase())) {
      for (const mapping of categoryMappings) {
        // 중복 방지
        if (!categories.some(c => c.category === mapping.category)) {
          categories.push(mapping);
        }
      }
    }
  }
  
  // 우선순위 순으로 정렬
  categories.sort((a, b) => a.priority - b.priority);
  
  // 기본값으로 universal 추가
  if (!categories.some(c => c.category === 'universal')) {
    categories.push({ category: 'universal', priority: 999 });
  }
  
  return categories.map(c => c.category);
}

/**
 * R2에서 표준 샘플 가져오기 (시각적 맥락 동기화)
 * 
 * Fallback 우선순위:
 * 1순위: {company}_{category}.png (질문과 상품까지 일치)
 * 2순위: {company}_universal.png (보험사만 일치)
 * 
 * @param env - 환경 변수 (R2 바인딩 포함)
 * @param companyCode - 보험사 코드
 * @param keyword - 검색 키워드 (상품 카테고리 추출용)
 * @returns 샘플 이미지 데이터 또는 null
 */
export async function getR2Sample(
  env: Env,
  companyCode: string,
  keyword?: string
): Promise<{ data: ArrayBuffer; sample: InsuranceSample; matchType: 'exact' | 'fallback' } | null> {
  const samples = INSURANCE_SAMPLES[companyCode];
  
  if (!samples || samples.length === 0) {
    console.log(`[R2 Fallback] ${companyCode}에 대한 샘플 매핑이 없습니다`);
    return null;
  }
  
  // 키워드에서 카테고리 코드 추출
  const targetCategories = keyword ? extractCategoryFromKeyword(keyword) : ['universal'];
  console.log(`[R2 Fallback] 타겟 카테고리: ${targetCategories.join(' → ')}`);
  
  // 우선순위 순서로 샘플 찾기
  let selectedSample: InsuranceSample | null = null;
  let matchType: 'exact' | 'fallback' = 'fallback';
  
  for (const category of targetCategories) {
    const matched = samples.find(s => s.product_category === category);
    if (matched) {
      selectedSample = matched;
      matchType = category === targetCategories[0] ? 'exact' : 'fallback';
      console.log(`[R2 Fallback] 카테고리 매칭: ${category} (${matchType})`);
      break;
    }
  }
  
  // 매칭되는 카테고리가 없으면 첫 번째 샘플 사용
  if (!selectedSample) {
    selectedSample = samples[0];
    matchType = 'fallback';
    console.log(`[R2 Fallback] 기본 샘플 사용: ${selectedSample.product_category}`);
  }
  
  try {
    // R2에서 샘플 가져오기
    const object = await env.R2_RAW?.get(selectedSample.sample_key);
    
    if (!object) {
      console.log(`[R2 Fallback] R2에서 샘플을 찾을 수 없음: ${selectedSample.sample_key}`);
      
      // universal 폴백 시도
      if (selectedSample.product_category !== 'universal') {
        const universalSample = samples.find(s => s.product_category === 'universal');
        if (universalSample) {
          console.log(`[R2 Fallback] universal 폴백 시도: ${universalSample.sample_key}`);
          const universalObject = await env.R2_RAW?.get(universalSample.sample_key);
          if (universalObject) {
            const data = await universalObject.arrayBuffer();
            console.log(`[R2 Fallback] universal 샘플 로드 성공: ${data.byteLength} bytes`);
            return { data, sample: universalSample, matchType: 'fallback' };
          }
        }
      }
      
      return null;
    }
    
    const data = await object.arrayBuffer();
    console.log(`[R2 Fallback] 샘플 로드 성공: ${selectedSample.sample_key} (${data.byteLength} bytes, ${matchType})`);
    
    return { data, sample: selectedSample, matchType };
    
  } catch (error) {
    console.error(`[R2 Fallback] R2 조회 오류:`, error);
    return null;
  }
}

/**
 * 보험사 코드로 한글명 가져오기
 */
export function getCompanyNameKo(companyCode: string): string {
  const samples = INSURANCE_SAMPLES[companyCode];
  return samples?.[0]?.company_name_ko || companyCode;
}

/**
 * R2 샘플 존재 여부 확인
 */
export function hasSampleForCompany(companyCode: string): boolean {
  return !!INSURANCE_SAMPLES[companyCode] && INSURANCE_SAMPLES[companyCode].length > 0;
}

/**
 * 모든 보험사 코드 목록
 */
export function getAllCompanyCodes(): string[] {
  return Object.keys(INSURANCE_SAMPLES);
}

/**
 * 특정 카테고리의 샘플 존재 여부 확인
 */
export function hasSampleForCategory(companyCode: string, category: string): boolean {
  const samples = INSURANCE_SAMPLES[companyCode];
  if (!samples) return false;
  return samples.some(s => s.product_category === category);
}

/**
 * 샘플 통계 정보 조회
 */
export function getSampleStats(): { totalCompanies: number; totalSamples: number; byCategory: Record<string, number> } {
  const stats = {
    totalCompanies: Object.keys(INSURANCE_SAMPLES).length,
    totalSamples: 0,
    byCategory: {} as Record<string, number>
  };
  
  for (const samples of Object.values(INSURANCE_SAMPLES)) {
    stats.totalSamples += samples.length;
    for (const sample of samples) {
      stats.byCategory[sample.product_category] = (stats.byCategory[sample.product_category] || 0) + 1;
    }
  }
  
  return stats;
}

/**
 * 컨텍스트 오버레이 텍스트 생성
 * 질문의 핵심 요약을 이미지에 합성하기 위한 텍스트 생성
 */
export function generateContextOverlayText(keyword: string, companyCode: string): string {
  const companyName = getCompanyNameKo(companyCode);
  const categories = extractCategoryFromKeyword(keyword);
  
  // 카테고리별 표시 텍스트
  const categoryLabels: Record<string, string> = {
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
    'universal': '종합보험'
  };
  
  const primaryCategory = categories[0];
  const categoryLabel = categoryLabels[primaryCategory] || '보험';
  
  return `${companyName} ${categoryLabel} 맞춤 설계안`;
}
