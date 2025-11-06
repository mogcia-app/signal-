/**
 * 認証付きfetch
 * Firebase AuthのIDトークンを自動付与
 *
 * Phase 2: authFetch導入により、全APIリクエストに認証トークンを自動付与
 * Phase 3: middleware再有効化の準備
 */

import { getAuth } from "firebase/auth";

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const auth = getAuth();
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(options.headers || {});
  if (token) {headers.set("Authorization", `Bearer ${token}`);}
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });

  // エラーチェックは呼び出し側で行うため、ここではチェックしない
  return response;
};
