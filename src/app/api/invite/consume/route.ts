import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { InviteTokenError, normalizeEmail, verifyInviteToken } from "@/lib/server/invite-token";

class InviteConsumeError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_REQUEST" | "INVITE_EXPIRED" | "INVITE_INVALID",
  ) {
    super(message);
    this.name = "InviteConsumeError";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      throw new InviteConsumeError("token is required", "INVALID_REQUEST");
    }

    const payload = await verifyInviteToken(token);
    const userId =
      (typeof payload.userId === "string" && payload.userId.trim()) ||
      (typeof payload.uid === "string" && payload.uid.trim()) ||
      "";
    const userEmail = normalizeEmail(payload.userEmail || payload.email);
    const nonce = typeof payload.nonce === "string" ? payload.nonce.trim() : "";

    if (!userId || !userEmail) {
      throw new InviteConsumeError("Invite payload is missing user identity", "INVITE_INVALID");
    }

    // Best-effort audit trail only. Invite links may have been issued by older admin flows,
    // so lack of a backing inviteLinks document should not block the recipient.
    try {
      const db = getAdminDb();
      await db.collection("inviteConsumeLogs").add({
        userId,
        userEmail,
        nonce: nonce || null,
        consumedAt: new Date().toISOString(),
        source: "invite_link",
      });
    } catch (error) {
      console.error("[invite/consume] failed to write consume log:", error);
    }

    return NextResponse.json({
      success: true,
      next: "/login",
      data: {
        userId,
        userEmail,
      },
    });
  } catch (error) {
    const inviteError =
      error instanceof InviteConsumeError
        ? error
        : error instanceof InviteTokenError
          ? new InviteConsumeError(
              error.message,
              error.code === "INVITE_EXPIRED" ? "INVITE_EXPIRED" : "INVITE_INVALID",
            )
          : new InviteConsumeError(
              error instanceof Error ? error.message : "Invite consume failed",
              "INVITE_INVALID",
            );

    const status =
      inviteError.code === "INVALID_REQUEST"
        ? 400
        : inviteError.code === "INVITE_EXPIRED"
          ? 410
          : 400;

    return NextResponse.json(
      {
        success: false,
        code: inviteError.code,
      },
      { status },
    );
  }
}
