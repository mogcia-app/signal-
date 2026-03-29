import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import {
  buildInstagramOAuthLoginUrl,
  createInstagramOAuthState,
} from "@/lib/server/meta-instagram-oauth";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-account-login-url", limit: 20, windowSeconds: 60 },
      auditEventName: "instagram_account_login_url",
    });

    let redirectPath = "/instagram/account";
    try {
      const body = (await request.json()) as { redirectPath?: string };
      if (typeof body.redirectPath === "string" && body.redirectPath.startsWith("/")) {
        redirectPath = body.redirectPath;
      }
    } catch {
      // body optional
    }

    const state = await createInstagramOAuthState({
      uid,
      redirectPath,
    });
    const loginUrl = buildInstagramOAuthLoginUrl({
      origin: request.nextUrl.origin,
      state,
    });

    return NextResponse.json({
      success: true,
      data: {
        loginUrl,
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
