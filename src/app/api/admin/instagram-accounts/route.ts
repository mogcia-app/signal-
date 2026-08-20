import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server/admin-auth";
import { buildErrorResponse } from "@/lib/server/auth-context";
import {
  getInstagramAccountForClient,
  listInstagramAccounts,
  upsertInstagramAccount,
} from "@/lib/server/instagram-scheduler";

type UpsertBody = {
  clientId?: string;
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
    await requireAdminContext(request, {
      requireContract: false,
      rateLimit: { key: "admin-instagram-accounts-read", limit: 60, windowSeconds: 60 },
      auditEventName: "admin_instagram_accounts_read",
    });

    const clientId = (request.nextUrl.searchParams.get("clientId") || "").trim();
    if (clientId) {
      const account = await getInstagramAccountForClient(clientId);
      return NextResponse.json({
        success: true,
        data: {
          account: account ? buildAccountResponse(account) : null,
        },
      });
    }

    const accounts = await listInstagramAccounts(100);
    return NextResponse.json({
      success: true,
      data: {
        accounts: accounts.map((account) => buildAccountResponse(account)),
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminContext(request, {
      requireContract: false,
      rateLimit: { key: "admin-instagram-accounts-write", limit: 30, windowSeconds: 60 },
      auditEventName: "admin_instagram_accounts_write",
    });

    let body: UpsertBody;
    try {
      body = (await request.json()) as UpsertBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const instagramUserId = typeof body.instagramUserId === "string" ? body.instagramUserId.trim() : "";
    const pageAccessToken = typeof body.pageAccessToken === "string" ? body.pageAccessToken.trim() : "";
    const existingAccount = clientId && !pageAccessToken ? await getInstagramAccountForClient(clientId) : null;
    const effectivePageAccessToken = pageAccessToken || existingAccount?.page_access_token || "";

    if (!clientId || !instagramUserId || !effectivePageAccessToken) {
      return NextResponse.json(
        { success: false, error: "clientId, instagramUserId, pageAccessToken are required." },
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
      clientId,
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
