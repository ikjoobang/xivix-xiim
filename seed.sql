-- XIVIX XIIM 테스트 데이터
-- 테이블명에 xiim_ 접두사 사용

-- 테스트 사용자 추가
-- API Key: dev_test_api_key_12345 → SHA-256 해시값
INSERT OR IGNORE INTO xiim_users (user_id, api_key_hash, company, tier, daily_limit)
VALUES 
  ('designer_01', '3722f055217bacf6eb9546ab6a09d4eb9e2df57eee6bf81019dfaed1551e98fd', '테스트 대리점', 'basic', 100),
  ('designer_02', 'hash_test_002', 'XIVIX 내부', 'enterprise', 1000),
  ('admin', 'hash_admin_001', 'XIVIX', 'enterprise', 10000);

-- 19개 생명보험사 데이터
INSERT OR IGNORE INTO xiim_insurance_companies (code, name_ko, name_en, category) VALUES
  ('ABL_LIFE', 'ABL생명', 'ABL Life Insurance', 'LIFE'),
  ('AIA', 'AIA생명', 'AIA Korea', 'LIFE'),
  ('DB_LIFE', 'DB생명', 'DB Life Insurance', 'LIFE'),
  ('IBK_LIFE', 'IBK연금보험', 'IBK Life Insurance', 'LIFE'),
  ('KB_LIFE', 'KB라이프생명', 'KB Life Insurance', 'LIFE'),
  ('KDB_LIFE', 'KDB생명', 'KDB Life Insurance', 'LIFE'),
  ('NH_LIFE', 'NH농협생명', 'NH Life Insurance', 'LIFE'),
  ('KYOBO_LIFE', '교보생명', 'Kyobo Life Insurance', 'LIFE'),
  ('DONGYANG_LIFE', '동양생명', 'Dongyang Life Insurance', 'LIFE'),
  ('LINA', '라이나생명', 'LINA Korea', 'LIFE'),
  ('METLIFE', '메트라이프생명', 'MetLife Korea', 'LIFE'),
  ('MIRAE_LIFE', '미래에셋생명', 'Mirae Asset Life Insurance', 'LIFE'),
  ('SAMSUNG_LIFE', '삼성생명', 'Samsung Life Insurance', 'LIFE'),
  ('SHINHAN_LIFE', '신한라이프', 'Shinhan Life Insurance', 'LIFE'),
  ('CHUBB_LIFE', '처브라이프생명', 'Chubb Life Korea', 'LIFE'),
  ('PRUDENTIAL', '푸르덴셜생명', 'Prudential Life Korea', 'LIFE'),
  ('HANA_LIFE', '하나생명', 'Hana Life Insurance', 'LIFE'),
  ('HANWHA_LIFE', '한화생명', 'Hanwha Life Insurance', 'LIFE'),
  ('HEUNGKUK_LIFE', '흥국생명', 'Heungkuk Life Insurance', 'LIFE');

-- 12개 손해보험사 데이터
INSERT OR IGNORE INTO xiim_insurance_companies (code, name_ko, name_en, category) VALUES
  ('AXA_GENERAL', 'AXA손해보험', 'AXA General Insurance Korea', 'NON_LIFE'),
  ('DB_INSURANCE', 'DB손해보험', 'DB Insurance', 'NON_LIFE'),
  ('KB_INSURANCE', 'KB손해보험', 'KB Insurance', 'NON_LIFE'),
  ('MG_INSURANCE', 'MG손해보험', 'MG Non-Life Insurance', 'NON_LIFE'),
  ('NH_INSURANCE', 'NH농협손해보험', 'NH Non-Life Insurance', 'NON_LIFE'),
  ('LOTTE_INSURANCE', '롯데손해보험', 'Lotte Insurance', 'NON_LIFE'),
  ('MERITZ_FIRE', '메리츠화재', 'Meritz Fire & Marine', 'NON_LIFE'),
  ('SAMSUNG_FIRE', '삼성화재', 'Samsung Fire & Marine', 'NON_LIFE'),
  ('CHUBB_GENERAL', '처브손해보험', 'Chubb General Insurance Korea', 'NON_LIFE'),
  ('HANWHA_GENERAL', '한화손해보험', 'Hanwha General Insurance', 'NON_LIFE'),
  ('HYUNDAI_MARINE', '현대해상', 'Hyundai Marine & Fire', 'NON_LIFE'),
  ('HEUNGKUK_FIRE', '흥국화재', 'Heungkuk Fire & Marine', 'NON_LIFE');
