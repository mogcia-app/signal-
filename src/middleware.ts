import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "./lib/server/firebase-token-verifier";
import { logSecurityEvent } from "./lib/server/logging";

const UNAUTHORIZED_RESPONSE = NextResponse.json(
  { success: false, error: "Unauthorized" },
  {
    status: 401,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  },
);

export async function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // 認証不要な公開APIエンドポイントのリスト
  const publicApiPaths = [
    "/api/auth/generate-custom-token", // 認証コールバック用（認証前にアクセスするため）
    "/api/tool-maintenance", // メンテナンス状態取得（ログインページで認証前にアクセスするため）
  ];

  // 公開APIパスの場合は認証チェックをスキップ
  if (publicApiPaths.includes(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const isEmulatorEnv =
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  const shouldBypassEdgeAuth =
    process.env.NEXT_PUBLIC_BYPASS_EDGE_AUTH === "true" ||
    (process.env.NODE_ENV !== "production" && Boolean(isEmulatorEnv));

  if (shouldBypassEdgeAuth) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        "[middleware] auth bypass enabled (NEXT_PUBLIC_BYPASS_EDGE_AUTH or emulator detected)",
      );
    }
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    await logSecurityEvent("auth_missing_token", {
      path: req.nextUrl.pathname,
      method: req.method,
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    });
    return UNAUTHORIZED_RESPONSE;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    await logSecurityEvent("auth_empty_token", {
      path: req.nextUrl.pathname,
      method: req.method,
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    });
    return UNAUTHORIZED_RESPONSE;
  }

  try {
    const payload = await verifyFirebaseIdToken(token);
    const uid = (payload.user_id as string | undefined) ?? (payload.sub as string | undefined);

    if (!uid) {
      throw new Error("Token payload missing user_id/sub");
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-auth-uid", uid);
    requestHeaders.set("x-auth-token-iat", payload.iat ? String(payload.iat) : "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    await logSecurityEvent("auth_invalid_token", {
      path: req.nextUrl.pathname,
      method: req.method,
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return UNAUTHORIZED_RESPONSE;
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
