import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  InviteTokenError,
  normalizeEmail,
  verifyInviteToken,
} from "@/lib/server/invite-token";

type InviteLinkRecord = {
  tokenHash?: string;
  tenantType?: string;
  agencyId?: string | null;
  userId?: string;
  userEmail?: string;
  used?: boolean;
};

class InviteConsumeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_REQUEST"
      | "INVITE_EXPIRED"
      | "INVITE_INVALID"
      | "INVITE_NOT_FOUND"
      | "INVITE_ALREADY_USED"
      | "INVITE_MISMATCH",
  ) {
    super(message);
    this.name = "InviteConsumeError";
  }
}

const toComparable = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toOptionalComparable = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const writeAuditLog = async (params: {
  event: "invite.consume.success" | "invite.consume.failure";
  actor: string;
  target: string;
  agencyId: string | null;
  reason: string;
  inviteLinkId?: string;
}) => {
  try {
    const db = getAdminDb();
    await db.collection("auditLogs").add({
      event: params.event,
      actor: params.actor,
      target: params.target,
      agencyId: params.agencyId,
      reason: params.reason,
      inviteLinkId: params.inviteLinkId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[invite/consume] failed to write audit log:", error);
  }
};

export async function POST(request: NextRequest) {
  let actor = "invite:unknown";
  let target = "invite:unknown";
  let agencyId: string | null = null;
  let inviteLinkId: string | undefined;

  try {
    const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      throw new InviteConsumeError("token is required", "INVALID_REQUEST");
    }

    const payload = await verifyInviteToken(token);
    if (typeof payload.tokenHash !== "string" || payload.tokenHash.trim() === "") {
      throw new InviteConsumeError("tokenHash is required in invite token", "INVITE_INVALID");
    }

    actor = payload.userId ? `invite:${payload.userId}` : `invite:${normalizeEmail(payload.userEmail) || "unknown"}`;
    target = payload.userId || normalizeEmail(payload.userEmail) || "invite:unknown";
    agencyId = toOptionalComparable(payload.agencyId);

    const payloadTokenHash = payload.tokenHash.trim();

    const db = getAdminDb();
    const consumed = await db.runTransaction(async (tx) => {
      const inviteQuery = db.collection("inviteLinks").where("tokenHash", "==", payloadTokenHash).limit(2);
      const snapshot = await tx.get(inviteQuery);

      if (snapshot.empty) {
        throw new InviteConsumeError("Invite link not found", "INVITE_NOT_FOUND");
      }
      if (snapshot.size > 1) {
        throw new InviteConsumeError("Duplicate invite links found", "INVITE_INVALID");
      }

      const inviteDoc = snapshot.docs[0];
      const inviteData = inviteDoc.data() as InviteLinkRecord;
      inviteLinkId = inviteDoc.id;

      if (inviteData.used !== false) {
        throw new InviteConsumeError("Invite link is already used", "INVITE_ALREADY_USED");
      }

      const payloadTenantType = toComparable(payload.tenantType);
      const payloadAgencyId = toOptionalComparable(payload.agencyId);
      const payloadUserId = toComparable(payload.userId);
      const payloadUserEmail = normalizeEmail(payload.userEmail);

      const inviteTenantType = toComparable(inviteData.tenantType);
      const inviteAgencyId = toOptionalComparable(inviteData.agencyId);
      const inviteUserId = toComparable(inviteData.userId);
      const inviteUserEmail = normalizeEmail(inviteData.userEmail);

      const mismatch =
        payloadTenantType !== inviteTenantType ||
        payloadAgencyId !== inviteAgencyId ||
        payloadUserId !== inviteUserId ||
        payloadUserEmail !== inviteUserEmail;

      if (mismatch) {
        throw new InviteConsumeError("Invite fields mismatch", "INVITE_MISMATCH");
      }

      tx.update(inviteDoc.ref, {
        used: true,
        usedAt: FieldValue.serverTimestamp(),
      });

      return {
        userId: inviteUserId,
        userEmail: inviteUserEmail,
        agencyId: inviteAgencyId,
      };
    });

    await writeAuditLog({
      event: "invite.consume.success",
      actor,
      target: consumed.userId || consumed.userEmail || target,
      agencyId: consumed.agencyId,
      reason: "consumed",
      inviteLinkId,
    });

    return NextResponse.json({
      success: true,
      next: "/login",
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

    await writeAuditLog({
      event: "invite.consume.failure",
      actor,
      target,
      agencyId,
      reason: inviteError.code,
      inviteLinkId,
    });

    const status =
      inviteError.code === "INVALID_REQUEST"
        ? 400
        : inviteError.code === "INVITE_EXPIRED"
          ? 410
          : inviteError.code === "INVITE_ALREADY_USED"
            ? 409
            : inviteError.code === "INVITE_NOT_FOUND" || inviteError.code === "INVITE_MISMATCH"
              ? 404
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
