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
          account: account
            ? {
                id: account.id,
                clientId: account.client_id,
                instagramUserId: account.instagram_user_id,
                pageAccessToken: account.page_access_token,
                tokenExpireAt: account.token_expire_at?.toISOString() || null,
              }
            : null,
        },
      });
    }

    const accounts = await listInstagramAccounts(100);
    return NextResponse.json({
      success: true,
      data: {
        accounts: accounts.map((account) => ({
          id: account.id,
          clientId: account.client_id,
          instagramUserId: account.instagram_user_id,
          pageAccessTokenMasked:
            account.page_access_token.length > 10
              ? `${account.page_access_token.slice(0, 6)}...${account.page_access_token.slice(-4)}`
              : account.page_access_token,
          tokenExpireAt: account.token_expire_at?.toISOString() || null,
        })),
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

    if (!clientId || !instagramUserId || !pageAccessToken) {
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
      pageAccessToken,
      tokenExpireAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: saved.id,
          clientId: saved.client_id,
          instagramUserId: saved.instagram_user_id,
          pageAccessToken: saved.page_access_token,
          tokenExpireAt: saved.token_expire_at?.toISOString() || null,
        },
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
