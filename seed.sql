-- XIVIX XIIM 테스트 데이터

-- 테스트 사용자 추가
INSERT OR IGNORE INTO users (user_id, api_key_hash, company, tier, daily_limit) VALUES 
  ('designer_01', 'hash_test_001', '테스트 대리점', 'basic', 100),
  ('designer_02', 'hash_test_002', 'XIVIX 내부', 'enterprise', 1000),
  ('admin', 'hash_admin_001', 'XIVIX', 'enterprise', 10000);

-- 19개 생명보험사 데이터
INSERT OR IGNORE INTO insurance_companies (code, name_ko, name_en, category) VALUES 
  ('SAMSUNG_LIFE', '삼성생명', 'Samsung Life', 'LIFE'),
  ('HANWHA_LIFE', '한화생명', 'Hanwha Life', 'LIFE'),
  ('KYOBO_LIFE', '교보생명', 'Kyobo Life', 'LIFE'),
  ('NH_LIFE', 'NH농협생명', 'NH Life', 'LIFE'),
  ('SHINHAN_LIFE', '신한라이프', 'Shinhan Life', 'LIFE'),
  ('MIRAE_LIFE', '미래에셋생명', 'Mirae Asset Life', 'LIFE'),
  ('KB_LIFE', 'KB생명', 'KB Life', 'LIFE'),
  ('HEUNGKUK_LIFE', '흥국생명', 'Heungkuk Life', 'LIFE'),
  ('DONGYANG_LIFE', '동양생명', 'Dongyang Life', 'LIFE'),
  ('ABL_LIFE', 'ABL생명', 'ABL Life', 'LIFE'),
  ('METLIFE', '메트라이프', 'MetLife', 'LIFE'),
  ('PRUDENTIAL', '푸르덴셜생명', 'Prudential', 'LIFE'),
  ('AIA', 'AIA생명', 'AIA Life', 'LIFE'),
  ('DB_LIFE', 'DB생명', 'DB Life', 'LIFE'),
  ('KDB_LIFE', 'KDB생명', 'KDB Life', 'LIFE'),
  ('CHUBB_LIFE', '처브라이프', 'Chubb Life', 'LIFE'),
  ('HANA_LIFE', '하나생명', 'Hana Life', 'LIFE'),
  ('IBK_LIFE', 'IBK연금보험', 'IBK Life', 'LIFE'),
  ('LINA', '라이나생명', 'LINA Life', 'LIFE');

-- 12개 손해보험사 데이터
INSERT OR IGNORE INTO insurance_companies (code, name_ko, name_en, category) VALUES 
  ('SAMSUNG_FIRE', '삼성화재', 'Samsung Fire', 'NON_LIFE'),
  ('HYUNDAI_MARINE', '현대해상', 'Hyundai Marine', 'NON_LIFE'),
  ('DB_INSURANCE', 'DB손해보험', 'DB Insurance', 'NON_LIFE'),
  ('KB_INSURANCE', 'KB손해보험', 'KB Insurance', 'NON_LIFE'),
  ('MERITZ_FIRE', '메리츠화재', 'Meritz Fire', 'NON_LIFE'),
  ('HANWHA_GENERAL', '한화손해보험', 'Hanwha General', 'NON_LIFE'),
  ('LOTTE_INSURANCE', '롯데손해보험', 'Lotte Insurance', 'NON_LIFE'),
  ('HEUNGKUK_FIRE', '흥국화재', 'Heungkuk Fire', 'NON_LIFE'),
  ('MG_INSURANCE', 'MG손해보험', 'MG Insurance', 'NON_LIFE'),
  ('NH_INSURANCE', 'NH농협손해보험', 'NH Insurance', 'NON_LIFE'),
  ('AXA_GENERAL', 'AXA손해보험', 'AXA General', 'NON_LIFE'),
  ('CHUBB_GENERAL', '처브손해보험', 'Chubb General', 'NON_LIFE');
