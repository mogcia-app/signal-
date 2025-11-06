import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ✅ middleware.ts（本番復旧用・安全版）
// ミドルウェア本体（ここは今後も使う前提で残す）
export function middleware(req: NextRequest) {
  // ここでは特にAPIの認証チェックを行わない
  // 将来的にCookie認証またはauthFetch対応後に再有効化予定
  return NextResponse.next();
}

// ✅ 本番一時安定版
// matcherから /api/x と /api/instagram を外すことで既存のAPIをブロックしない
export const config = {
  matcher: [
    // 認証が必要なページやルートのみ残す
    "/admin/:path*",
    "/my-account",
    "/settings/:path*",
    // '/api/x/:path*',        // ← 一時的に無効化（Phase 2で再有効化）
    // '/api/instagram/:path*', // ← 一時的に無効化（Phase 2で再有効化）
  ],
};
