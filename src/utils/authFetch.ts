/**
 * 認証付きfetch
 * Firebase AuthのIDトークンを自動付与
 * 
 * Phase 2: authFetch導入により、全APIリクエストに認証トークンを自動付与
 * Phase 3: middleware再有効化の準備
 */

import { auth } from '../lib/firebase';

/**
 * 認証付きfetch
 * Firebase AuthのIDトークンを自動付与
 * 
 * @param input - fetch先のURL
 * @param init - fetchオプション
 * @returns fetch Promise
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  // Firebase AuthからIDトークンを取得
  const token = await auth.currentUser?.getIdToken();
  
  // ヘッダーを準備
  const headers = new Headers(init.headers || {});

  // Content-Typeがなければ自動設定
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // 認証トークンを追加
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn('⚠️ authFetch: Firebase認証トークンが取得できませんでした');
  }

  // fetchを実行
  return fetch(input, { ...init, headers });
}

/**
 * 使用例:
 * 
 * // 旧コード
 * const response = await fetch('/api/x/posts', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data)
 * });
 * 
 * // 新コード（authFetch使用）
 * import { authFetch } from '@/utils/authFetch';
 * 
 * const response = await authFetch('/api/x/posts', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 */

