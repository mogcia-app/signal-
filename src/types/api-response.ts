/**
 * 共通APIレスポンス型定義
 * すべてのAPIエンドポイントで使用される標準的なレスポンス構造を定義
 */

/**
 * 成功時のAPIレスポンス
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * エラー時のAPIレスポンス
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode?: number;
}

/**
 * APIレスポンス（成功またはエラー）
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 型ガード: レスポンスが成功かどうかを判定
 */
export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * 型ガード: レスポンスがエラーかどうかを判定
 */
export function isApiErrorResponse(
  response: ApiResponse<unknown>
): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * ページネーション付きAPIレスポンス
 */
export type PaginatedApiResponse<T = unknown> = ApiSuccessResponse<{
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}>;

/**
 * リスト形式のAPIレスポンス（ページネーションなし）
 */
export type ListApiResponse<T = unknown> = ApiSuccessResponse<T[]>;

