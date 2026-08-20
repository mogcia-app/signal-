import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getInstagramAccountForClient, upsertInstagramAccount } from "@/lib/server/instagram-scheduler";

type UpsertBody = {
  instagramUserId?: string;
  pageAccessToken?: string;
  tokenExpireAt?: string | null;
};

function maskToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }
  return token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : "保存済み";
}

function buildAccountResponse(account: {
  id: string;
  client_id: string;
  instagram_user_id: string;
  page_access_token: string;
  token_expire_at?: Date | null;
}) {
  return {
    id: account.id,
    clientId: account.client_id,
    instagramUserId: account.instagram_user_id,
    hasAccessToken: Boolean(account.page_access_token),
    pageAccessTokenMasked: maskToken(account.page_access_token),
    tokenExpireAt: account.token_expire_at?.toISOString() || null,
  };
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_TOKEN_EXPIRE_AT");
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-account-read", limit: 60, windowSeconds: 60 },
      auditEventName: "instagram_account_read",
    });

    const account = await getInstagramAccountForClient(uid);
    return NextResponse.json({
      success: true,
      data: {
        account: account
          ? buildAccountResponse(account)
          : null,
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-account-write", limit: 30, windowSeconds: 60 },
      auditEventName: "instagram_account_write",
    });

    let body: UpsertBody;
    try {
      body = (await request.json()) as UpsertBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const instagramUserId = typeof body.instagramUserId === "string" ? body.instagramUserId.trim() : "";
    const pageAccessToken = typeof body.pageAccessToken === "string" ? body.pageAccessToken.trim() : "";
    const existingAccount = pageAccessToken ? null : await getInstagramAccountForClient(uid);
    const effectivePageAccessToken = pageAccessToken || existingAccount?.page_access_token || "";

    if (!instagramUserId || !effectivePageAccessToken) {
      return NextResponse.json(
        { success: false, error: "instagramUserId, pageAccessToken are required." },
        { status: 400 },
      );
    }

    let tokenExpireAt: Date | null;
    try {
      tokenExpireAt = parseOptionalDate(body.tokenExpireAt);
    } catch {
      return NextResponse.json(
        { success: false, error: "tokenExpireAt must be a valid ISO datetime." },
        { status: 400 },
      );
    }

    const saved = await upsertInstagramAccount({
      clientId: uid,
      instagramUserId,
      pageAccessToken: effectivePageAccessToken,
      tokenExpireAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        account: buildAccountResponse(saved),
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
