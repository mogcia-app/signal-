import type { NextRequest } from "next/server";
import { ForbiddenError, requireAuthContext } from "@/lib/server/auth-context";
import { getAdminDb } from "@/lib/firebase-admin";

const ADMIN_ROLES = new Set(["admin", "super_admin", "billing_admin"]);

const normalizeRole = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
};

export async function requireAdminContext(
  request: NextRequest,
  options: Parameters<typeof requireAuthContext>[1] = {},
) {
  const auth = await requireAuthContext(request, options);
  const userDoc = await getAdminDb().collection("users").doc(auth.uid).get();
  const role = normalizeRole(userDoc.data()?.role);

  if (!ADMIN_ROLES.has(role)) {
    throw new ForbiddenError("Forbidden");
  }

  return auth;
}
