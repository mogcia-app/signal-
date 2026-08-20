"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";

const ADMIN_ROLES = new Set(["admin", "billing_admin", "super_admin"]);

function isAdminRole(role: unknown): boolean {
  return ADMIN_ROLES.has(String(role || "").trim().toLowerCase());
}

export function useIsAdminRole(): { isAdmin: boolean; loading: boolean } {
  const { userProfile, loading } = useUserProfile();
  return {
    isAdmin: isAdminRole(userProfile?.role),
    loading,
  };
}

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAdmin, loading } = useIsAdminRole();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
