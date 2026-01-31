// ============================================
// ローカルストレージ管理ユーティリティ
// ============================================
// 同盟固有のデータをローカルに保存

// ストレージキーの生成
function getStorageKey(allianceId: string, key: string): string {
  return `wos_${allianceId}_${key}`;
}

// データ保存
export function saveToStorage<T>(allianceId: string, key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = getStorageKey(allianceId, key);
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

// データ取得
export function getFromStorage<T>(allianceId: string, key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const storageKey = getStorageKey(allianceId, key);
    const value = localStorage.getItem(storageKey);
    
    if (value === null) {
      return defaultValue;
    }
    
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error getting from storage:', error);
    return defaultValue;
  }
}

// データ削除
export function removeFromStorage(allianceId: string, key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = getStorageKey(allianceId, key);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error removing from storage:', error);
  }
}

// 同盟の全データをクリア
export function clearAllianceStorage(allianceId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const prefix = `wos_${allianceId}_`;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing alliance storage:', error);
  }
}
