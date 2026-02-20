"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FeedLabRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 一時停止: 旧 /instagram/lab/feed 導線
    router.replace("/dashboard");
  }, [router]);

  return null;
}
