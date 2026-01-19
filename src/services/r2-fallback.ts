/**
 * XIVIX XIIM - R2 표준 샘플 폴백 시스템
 * 
 * 검색 결과가 부실하거나 검증 실패 시
 * R2에 저장된 검증된 표준 설계안 샘플을 사용
 */

import type { Env } from '../types';

/** 보험사 샘플 정보 */
export interface InsuranceSample {
  company_code: string;
  company_name_ko: string;
  category: 'LIFE' | 'NON_LIFE';
  sample_key: string;  // R2 키
  product_type: string; // 상품 유형 (종신, 암, 어린이 등)
}

/**
 * 31개 보험사 표준 샘플 매핑
 * R2 경로: samples/{category}/{company_code}/{product_type}.png
 */
export const INSURANCE_SAMPLES: Record<string, InsuranceSample[]> = {
  // ============================================
  // 생명보험사 (19개)
  // ============================================
  'SAMSUNG_LIFE': [
    { company_code: 'SAMSUNG_LIFE', company_name_ko: '삼성생명', category: 'LIFE', sample_key: 'samples/life/samsung/universal.png', product_type: '종신보험' },
    { company_code: 'SAMSUNG_LIFE', company_name_ko: '삼성생명', category: 'LIFE', sample_key: 'samples/life/samsung/cancer.png', product_type: '암보험' }
  ],
  'HANWHA_LIFE': [
    { company_code: 'HANWHA_LIFE', company_name_ko: '한화생명', category: 'LIFE', sample_key: 'samples/life/hanwha/universal.png', product_type: '종신보험' }
  ],
  'KYOBO_LIFE': [
    { company_code: 'KYOBO_LIFE', company_name_ko: '교보생명', category: 'LIFE', sample_key: 'samples/life/kyobo/universal.png', product_type: '종신보험' }
  ],
  'NH_LIFE': [
    { company_code: 'NH_LIFE', company_name_ko: 'NH농협생명', category: 'LIFE', sample_key: 'samples/life/nh/universal.png', product_type: '종신보험' }
  ],
  'SHINHAN_LIFE': [
    { company_code: 'SHINHAN_LIFE', company_name_ko: '신한라이프', category: 'LIFE', sample_key: 'samples/life/shinhan/universal.png', product_type: '종신보험' }
  ],
  'MIRAE_LIFE': [
    { company_code: 'MIRAE_LIFE', company_name_ko: '미래에셋생명', category: 'LIFE', sample_key: 'samples/life/mirae/universal.png', product_type: '변액보험' }
  ],
  'KB_LIFE': [
    { company_code: 'KB_LIFE', company_name_ko: 'KB라이프생명', category: 'LIFE', sample_key: 'samples/life/kb/universal.png', product_type: '종신보험' }
  ],
  'AIA': [
    { company_code: 'AIA', company_name_ko: 'AIA생명', category: 'LIFE', sample_key: 'samples/life/aia/universal.png', product_type: '종신보험' }
  ],
  'METLIFE': [
    { company_code: 'METLIFE', company_name_ko: '메트라이프생명', category: 'LIFE', sample_key: 'samples/life/metlife/universal.png', product_type: '종신보험' }
  ],
  'PRUDENTIAL': [
    { company_code: 'PRUDENTIAL', company_name_ko: '푸르덴셜생명', category: 'LIFE', sample_key: 'samples/life/prudential/universal.png', product_type: '종신보험' }
  ],
  'LINA': [
    { company_code: 'LINA', company_name_ko: '라이나생명', category: 'LIFE', sample_key: 'samples/life/lina/cancer.png', product_type: '암보험' }
  ],
  'DB_LIFE': [
    { company_code: 'DB_LIFE', company_name_ko: 'DB생명', category: 'LIFE', sample_key: 'samples/life/db/universal.png', product_type: '종신보험' }
  ],
  'DONGYANG_LIFE': [
    { company_code: 'DONGYANG_LIFE', company_name_ko: '동양생명', category: 'LIFE', sample_key: 'samples/life/dongyang/universal.png', product_type: '종신보험' }
  ],
  'ABL_LIFE': [
    { company_code: 'ABL_LIFE', company_name_ko: 'ABL생명', category: 'LIFE', sample_key: 'samples/life/abl/universal.png', product_type: '종신보험' }
  ],
  'CHUBB_LIFE': [
    { company_code: 'CHUBB_LIFE', company_name_ko: '처브라이프생명', category: 'LIFE', sample_key: 'samples/life/chubb/universal.png', product_type: '종신보험' }
  ],
  'KDB_LIFE': [
    { company_code: 'KDB_LIFE', company_name_ko: 'KDB생명', category: 'LIFE', sample_key: 'samples/life/kdb/universal.png', product_type: '종신보험' }
  ],
  'IBK_LIFE': [
    { company_code: 'IBK_LIFE', company_name_ko: 'IBK연금보험', category: 'LIFE', sample_key: 'samples/life/ibk/pension.png', product_type: '연금보험' }
  ],
  'HANA_LIFE': [
    { company_code: 'HANA_LIFE', company_name_ko: '하나생명', category: 'LIFE', sample_key: 'samples/life/hana/universal.png', product_type: '종신보험' }
  ],
  'HEUNGKUK_LIFE': [
    { company_code: 'HEUNGKUK_LIFE', company_name_ko: '흥국생명', category: 'LIFE', sample_key: 'samples/life/heungkuk/universal.png', product_type: '종신보험' }
  ],
  
  // ============================================
  // 손해보험사 (12개)
  // ============================================
  'SAMSUNG_FIRE': [
    { company_code: 'SAMSUNG_FIRE', company_name_ko: '삼성화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/samsung/driver.png', product_type: '운전자보험' },
    { company_code: 'SAMSUNG_FIRE', company_name_ko: '삼성화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/samsung/child.png', product_type: '어린이보험' }
  ],
  'HYUNDAI_MARINE': [
    { company_code: 'HYUNDAI_MARINE', company_name_ko: '현대해상', category: 'NON_LIFE', sample_key: 'samples/nonlife/hyundai/child.png', product_type: '어린이보험' },
    { company_code: 'HYUNDAI_MARINE', company_name_ko: '현대해상', category: 'NON_LIFE', sample_key: 'samples/nonlife/hyundai/driver.png', product_type: '운전자보험' }
  ],
  'DB_INSURANCE': [
    { company_code: 'DB_INSURANCE', company_name_ko: 'DB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/db/driver.png', product_type: '운전자보험' }
  ],
  'KB_INSURANCE': [
    { company_code: 'KB_INSURANCE', company_name_ko: 'KB손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/kb/child.png', product_type: '어린이보험' }
  ],
  'MERITZ_FIRE': [
    { company_code: 'MERITZ_FIRE', company_name_ko: '메리츠화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/meritz/driver.png', product_type: '운전자보험' }
  ],
  'HANWHA_GENERAL': [
    { company_code: 'HANWHA_GENERAL', company_name_ko: '한화손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/hanwha/driver.png', product_type: '운전자보험' }
  ],
  'NH_INSURANCE': [
    { company_code: 'NH_INSURANCE', company_name_ko: 'NH농협손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/nh/driver.png', product_type: '운전자보험' }
  ],
  'LOTTE_INSURANCE': [
    { company_code: 'LOTTE_INSURANCE', company_name_ko: '롯데손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/lotte/driver.png', product_type: '운전자보험' }
  ],
  'MG_INSURANCE': [
    { company_code: 'MG_INSURANCE', company_name_ko: 'MG손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/mg/driver.png', product_type: '운전자보험' }
  ],
  'HEUNGKUK_FIRE': [
    { company_code: 'HEUNGKUK_FIRE', company_name_ko: '흥국화재', category: 'NON_LIFE', sample_key: 'samples/nonlife/heungkuk/driver.png', product_type: '운전자보험' }
  ],
  'AXA_GENERAL': [
    { company_code: 'AXA_GENERAL', company_name_ko: 'AXA손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/axa/driver.png', product_type: '운전자보험' }
  ],
  'CHUBB_GENERAL': [
    { company_code: 'CHUBB_GENERAL', company_name_ko: '처브손해보험', category: 'NON_LIFE', sample_key: 'samples/nonlife/chubb/driver.png', product_type: '운전자보험' }
  ]
};

/**
 * R2에서 표준 샘플 가져오기
 * 
 * @param env - 환경 변수 (R2 바인딩 포함)
 * @param companyCode - 보험사 코드
 * @param productKeyword - 상품 키워드 (종신, 암, 어린이 등)
 * @returns 샘플 이미지 데이터 또는 null
 */
export async function getR2Sample(
  env: Env,
  companyCode: string,
  productKeyword?: string
): Promise<{ data: ArrayBuffer; sample: InsuranceSample } | null> {
  const samples = INSURANCE_SAMPLES[companyCode];
  
  if (!samples || samples.length === 0) {
    console.log(`[R2 Fallback] ${companyCode}에 대한 샘플이 없습니다`);
    return null;
  }
  
  // 상품 키워드와 매칭되는 샘플 찾기
  let selectedSample = samples[0]; // 기본값
  
  if (productKeyword) {
    const keywordLower = productKeyword.toLowerCase();
    const matched = samples.find(s => 
      s.product_type.includes(productKeyword) ||
      keywordLower.includes(s.product_type)
    );
    if (matched) {
      selectedSample = matched;
    }
  }
  
  try {
    // R2에서 샘플 가져오기
    const object = await env.R2_RAW?.get(selectedSample.sample_key);
    
    if (!object) {
      console.log(`[R2 Fallback] R2에서 샘플을 찾을 수 없음: ${selectedSample.sample_key}`);
      return null;
    }
    
    const data = await object.arrayBuffer();
    console.log(`[R2 Fallback] 샘플 로드 성공: ${selectedSample.sample_key} (${data.byteLength} bytes)`);
    
    return { data, sample: selectedSample };
    
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
