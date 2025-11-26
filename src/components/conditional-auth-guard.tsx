"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";

// 認証が不要な公開ページのパス
const PUBLIC_PATHS = [
  "/login",
  "/terms",
  "/guide",
  "/test-sentry",
];

export function ConditionalAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 公開ページの場合は認証チェックをスキップ
  if (PUBLIC_PATHS.includes(pathname) || pathname === "/") {
    return <>{children}</>;
  }

  // それ以外のページは認証が必要
  return <AuthGuard>{children}</AuthGuard>;
}

