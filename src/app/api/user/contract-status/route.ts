import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuthContext } from "@/lib/server/auth-context";

type DateLike =
  | Date
  | string
  | number
  | {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    }
  | null
  | undefined;

const toDate = (value: DateLike): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const parsed = value.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value.seconds === "number") {
      const millis =
        value.seconds * 1000 + (typeof value.nanoseconds === "number" ? value.nanoseconds / 1_000_000 : 0);
      const parsed = new Date(millis);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
};

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request);
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: true,
          isValid: false,
          reason: "user_not_found",
        },
        { status: 200 },
      );
    }

    const userData = userDoc.data() as {
      status?: string;
      contractEndDate?: DateLike;
    };

    const now = new Date();
    const status = typeof userData.status === "string" ? userData.status.trim().toLowerCase() : "";
    const endDate = toDate(userData.contractEndDate);
    const isStatusActive = status === "active";
    const isDateValid = Boolean(endDate && endDate.getTime() > now.getTime());
    const isValid = isStatusActive && isDateValid;

    return NextResponse.json(
      {
        success: true,
        isValid,
        status: status || "unknown",
        contractEndDate: endDate ? endDate.toISOString() : null,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: error.message,
        },
        { status: 401 },
      );
    }

    console.error("[api/user/contract-status] failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check contract status",
      },
      { status: 500 },
    );
  }
}
