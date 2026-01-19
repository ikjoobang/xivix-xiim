/**
 * XIVIX XIIM - Database Service
 * D1 Database 연동 및 CRUD 작업
 */

import type { User, ImageLog, InsuranceCompany } from '../types';
import { generateCombinedHash, hashApiKey } from '../utils/hash';

// ============================================
// User Operations
// ============================================

/**
 * API 키로 사용자 인증
 */
export async function authenticateUser(
  db: D1Database,
  apiKey: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const hashedKey = await hashApiKey(apiKey);
    
    const result = await db.prepare(
      'SELECT * FROM users WHERE api_key_hash = ?'
    ).bind(hashedKey).first<User>();
    
    if (!result) {
      return { success: false, error: 'Invalid API key' };
    }
    
    return { success: true, user: result };
  } catch (error) {
    return { 
      success: false, 
      error: `Auth error: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

/**
 * 사용자 ID로 사용자 조회
 */
export async function getUserById(
  db: D1Database,
  userId: string
): Promise<User | null> {
  try {
    const result = await db.prepare(
      'SELECT * FROM users WHERE user_id = ?'
    ).bind(userId).first<User>();
    
    return result || null;
  } catch (error) {
    console.error('getUserById error:', error);
    return null;
  }
}

/**
 * 사용자 일일 사용량 확인
 */
export async function checkDailyUsage(
  db: D1Database,
  userId: string
): Promise<{ used: number; limit: number; remaining: number }> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 사용자 정보 및 일일 제한 조회
    const user = await getUserById(db, userId);
    const dailyLimit = user?.daily_limit || 100;
    
    // 오늘 사용량 조회
    const usage = await db.prepare(
      'SELECT request_count FROM daily_usage WHERE user_id = ? AND date = ?'
    ).bind(userId, today).first<{ request_count: number }>();
    
    const used = usage?.request_count || 0;
    
    return {
      used,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - used)
    };
  } catch (error) {
    console.error('checkDailyUsage error:', error);
    return { used: 0, limit: 100, remaining: 100 };
  }
}

/**
 * 일일 사용량 증가
 */
export async function incrementDailyUsage(
  db: D1Database,
  userId: string,
  success: boolean = true
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // UPSERT로 사용량 업데이트
    await db.prepare(`
      INSERT INTO daily_usage (user_id, date, request_count, success_count, failed_count)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        request_count = request_count + 1,
        success_count = success_count + ?,
        failed_count = failed_count + ?,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      userId, 
      today, 
      success ? 1 : 0, 
      success ? 0 : 1,
      success ? 1 : 0,
      success ? 0 : 1
    ).run();
  } catch (error) {
    console.error('incrementDailyUsage error:', error);
  }
}

// ============================================
// Image Log Operations
// ============================================

/**
 * 이미지 처리 로그 생성
 */
export async function createImageLog(
  db: D1Database,
  log: Partial<ImageLog>
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const result = await db.prepare(`
      INSERT INTO image_logs (
        request_id, user_id, source_hash, variant_seed, keyword, 
        target_company, insurance_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log.request_id,
      log.user_id,
      log.source_hash || '',
      log.variant_seed || '',
      log.keyword || null,
      log.target_company || null,
      log.insurance_type || null,
      log.status || 'pending'
    ).run();
    
    return { success: true, id: result.meta.last_row_id as number };
  } catch (error) {
    return { 
      success: false, 
      error: `Create log error: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

/**
 * 이미지 처리 로그 업데이트
 */
export async function updateImageLog(
  db: D1Database,
  requestId: string,
  updates: Partial<ImageLog>
): Promise<{ success: boolean; error?: string }> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    // 동적으로 업데이트할 필드 구성
    const allowedFields = [
      'source_hash', 'variant_seed', 'raw_r2_key', 'final_r2_key',
      'cloudinary_public_id', 'final_url', 'masking_zones', 'masking_applied',
      'variation_params', 'status', 'error_message', 'processing_time_ms', 'completed_at'
    ];
    
    for (const field of allowedFields) {
      if (updates[field as keyof ImageLog] !== undefined) {
        fields.push(`${field} = ?`);
        const value = updates[field as keyof ImageLog];
        // JSON 필드는 문자열로 변환
        if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }
    
    if (fields.length === 0) {
      return { success: true }; // 업데이트할 내용 없음
    }
    
    values.push(requestId);
    
    await db.prepare(`
      UPDATE image_logs SET ${fields.join(', ')} WHERE request_id = ?
    `).bind(...values).run();
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Update log error: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

/**
 * 요청 ID로 로그 조회
 */
export async function getImageLogByRequestId(
  db: D1Database,
  requestId: string
): Promise<ImageLog | null> {
  try {
    const result = await db.prepare(
      'SELECT * FROM image_logs WHERE request_id = ?'
    ).bind(requestId).first<ImageLog>();
    
    return result || null;
  } catch (error) {
    console.error('getImageLogByRequestId error:', error);
    return null;
  }
}

// ============================================
// Hash Registry Operations (중복 체크)
// ============================================

/**
 * 결합 해시 중복 체크
 */
export async function checkHashDuplicate(
  db: D1Database,
  sourceHash: string,
  variantSeed: string
): Promise<{ isDuplicate: boolean; existingRequestId?: string }> {
  try {
    const combinedHash = await generateCombinedHash(sourceHash, variantSeed);
    
    const result = await db.prepare(
      'SELECT request_id FROM hash_registry WHERE combined_hash = ?'
    ).bind(combinedHash).first<{ request_id: string }>();
    
    if (result) {
      return { isDuplicate: true, existingRequestId: result.request_id };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    console.error('checkHashDuplicate error:', error);
    return { isDuplicate: false };
  }
}

/**
 * 해시 레지스트리에 등록
 */
export async function registerHash(
  db: D1Database,
  sourceHash: string,
  variantSeed: string,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const combinedHash = await generateCombinedHash(sourceHash, variantSeed);
    
    await db.prepare(
      'INSERT INTO hash_registry (combined_hash, request_id) VALUES (?, ?)'
    ).bind(combinedHash, requestId).run();
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Register hash error: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

// ============================================
// Insurance Company Operations
// ============================================

/**
 * 보험사 코드로 조회
 */
export async function getInsuranceCompanyByCode(
  db: D1Database,
  code: string
): Promise<InsuranceCompany | null> {
  try {
    const result = await db.prepare(
      'SELECT * FROM insurance_companies WHERE code = ? AND is_active = 1'
    ).bind(code).first<InsuranceCompany>();
    
    return result || null;
  } catch (error) {
    console.error('getInsuranceCompanyByCode error:', error);
    return null;
  }
}

/**
 * 카테고리별 보험사 목록 조회
 */
export async function getInsuranceCompaniesByCategory(
  db: D1Database,
  category: 'LIFE' | 'NON_LIFE'
): Promise<InsuranceCompany[]> {
  try {
    const result = await db.prepare(
      'SELECT * FROM insurance_companies WHERE category = ? AND is_active = 1 ORDER BY name_ko'
    ).bind(category).all<InsuranceCompany>();
    
    return result.results || [];
  } catch (error) {
    console.error('getInsuranceCompaniesByCategory error:', error);
    return [];
  }
}

/**
 * 모든 활성 보험사 조회
 */
export async function getAllInsuranceCompanies(
  db: D1Database
): Promise<InsuranceCompany[]> {
  try {
    const result = await db.prepare(
      'SELECT * FROM insurance_companies WHERE is_active = 1 ORDER BY category, name_ko'
    ).all<InsuranceCompany>();
    
    return result.results || [];
  } catch (error) {
    console.error('getAllInsuranceCompanies error:', error);
    return [];
  }
}
