import { NextRequest, NextResponse } from "next/server";
import { consumeInstagramOAuthCallback } from "@/lib/server/meta-instagram-oauth";

function buildRedirectUrl(request: NextRequest, path: string, params: Record<string, string>) {
  const url = new URL(path, request.nextUrl.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error_message") || request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";

  if (error) {
    return NextResponse.redirect(
      buildRedirectUrl(request, "/instagram/account", {
        error,
      }),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      buildRedirectUrl(request, "/instagram/account", {
        error: "Meta callback is missing code or state.",
      }),
    );
  }

  try {
    const result = await consumeInstagramOAuthCallback({
      origin: request.nextUrl.origin,
      code,
      state,
    });

    return NextResponse.redirect(
      buildRedirectUrl(request, result.redirectPath, {
        connected: "1",
      }),
    );
  } catch (callbackError) {
    return NextResponse.redirect(
      buildRedirectUrl(request, "/instagram/account", {
        error:
          callbackError instanceof Error ? callbackError.message : "Meta account connection failed.",
      }),
    );
  }
}
