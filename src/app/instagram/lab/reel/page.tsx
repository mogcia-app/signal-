"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReelLabRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 一時停止: 旧 /instagram/lab/reel 導線
    router.replace("/home");
  }, [router]);

  return null;
}
