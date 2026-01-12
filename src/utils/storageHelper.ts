/**
 * ストレージヘルパー関数
 * Googleログインのリダイレクト後も値を保持するためのユーティリティ
 */

const DB_NAME = 'kintai_storage';
const DB_VERSION = 1;
const STORE_NAME = 'login_data';

/**
 * IndexedDBを開く
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

/**
 * loginUserTypeをIndexedDBに保存
 */
export const saveLoginUserType = async (userType: 'admin' | 'employee'): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.put(userType, 'loginUserType');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log('✅ saveLoginUserType - Saved to IndexedDB:', userType);
  } catch (error) {
    console.error('❌ saveLoginUserType - Failed to save to IndexedDB:', error);
    // IndexedDBに保存できない場合は、Cookie、sessionStorage、localStorageにも保存（フォールバック）
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000); // 1時間
    document.cookie = `loginUserType=${encodeURIComponent(userType)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    sessionStorage.setItem('loginUserType', userType);
    localStorage.setItem('loginUserType', userType);
  }
};

/**
 * loginUserTypeをIndexedDBから取得
 */
export const getLoginUserType = async (): Promise<'admin' | 'employee' | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const userType = await new Promise<'admin' | 'employee' | null>((resolve, reject) => {
      const request = store.get('loginUserType');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    if (userType) {
      console.log('✅ getLoginUserType - Retrieved from IndexedDB:', userType);
    }
    return userType;
  } catch (error) {
    console.error('❌ getLoginUserType - Failed to retrieve from IndexedDB:', error);
    // IndexedDBから取得できない場合は、Cookie、sessionStorage、localStorageから取得（フォールバック）
    // Cookieから取得
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'loginUserType') {
        const userType = decodeURIComponent(value) as 'admin' | 'employee';
        console.log('✅ getLoginUserType - Retrieved from cookie:', userType);
        return userType;
      }
    }
    // sessionStorageから取得
    const fromSession = sessionStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
    if (fromSession) {
      console.log('✅ getLoginUserType - Retrieved from sessionStorage:', fromSession);
      return fromSession;
    }
    // localStorageから取得
    const fromLocal = localStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
    if (fromLocal) {
      console.log('✅ getLoginUserType - Retrieved from localStorage:', fromLocal);
      return fromLocal;
    }
    return null;
  }
};

/**
 * loginUserTypeをIndexedDBから削除
 */
export const removeLoginUserType = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('loginUserType');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log('✅ removeLoginUserType - Removed from IndexedDB');
  } catch (error) {
    console.error('❌ removeLoginUserType - Failed to remove from IndexedDB:', error);
  }
  
  // Cookie、sessionStorage、localStorageからも削除（念のため）
  document.cookie = 'loginUserType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  sessionStorage.removeItem('loginUserType');
  localStorage.removeItem('loginUserType');
};

/**
 * googleLoginInProgressフラグをIndexedDBに保存
 */
export const saveGoogleLoginInProgress = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.put('true', 'googleLoginInProgress');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log('✅ saveGoogleLoginInProgress - Saved to IndexedDB');
  } catch (error) {
    console.error('❌ saveGoogleLoginInProgress - Failed to save to IndexedDB:', error);
    // IndexedDBに保存できない場合は、Cookie、sessionStorage、localStorageにも保存（フォールバック）
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000); // 1時間
    document.cookie = `googleLoginInProgress=true; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    sessionStorage.setItem('googleLoginInProgress', 'true');
    localStorage.setItem('googleLoginInProgress', 'true');
  }
};

/**
 * googleLoginInProgressフラグをIndexedDBから取得
 */
export const getGoogleLoginInProgress = async (): Promise<boolean> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const value = await new Promise<string | null>((resolve, reject) => {
      const request = store.get('googleLoginInProgress');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    if (value === 'true') {
      console.log('✅ getGoogleLoginInProgress - Retrieved from IndexedDB: true');
      return true;
    }
  } catch (error) {
    console.error('❌ getGoogleLoginInProgress - Failed to retrieve from IndexedDB:', error);
  }
  
  // IndexedDBから取得できない場合は、Cookie、sessionStorage、localStorageから取得（フォールバック）
  // Cookieから取得
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'googleLoginInProgress' && value === 'true') {
      console.log('✅ getGoogleLoginInProgress - Retrieved from cookie: true');
      return true;
    }
  }
  // sessionStorageから取得
  if (sessionStorage.getItem('googleLoginInProgress') === 'true') {
    console.log('✅ getGoogleLoginInProgress - Retrieved from sessionStorage: true');
    return true;
  }
  // localStorageから取得
  if (localStorage.getItem('googleLoginInProgress') === 'true') {
    console.log('✅ getGoogleLoginInProgress - Retrieved from localStorage: true');
    return true;
  }
  return false;
};

/**
 * googleLoginInProgressフラグをIndexedDBから削除
 */
export const removeGoogleLoginInProgress = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('googleLoginInProgress');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log('✅ removeGoogleLoginInProgress - Removed from IndexedDB');
  } catch (error) {
    console.error('❌ removeGoogleLoginInProgress - Failed to remove from IndexedDB:', error);
  }
  
  // Cookie、sessionStorage、localStorageからも削除（念のため）
  document.cookie = 'googleLoginInProgress=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  sessionStorage.removeItem('googleLoginInProgress');
  localStorage.removeItem('googleLoginInProgress');
};

