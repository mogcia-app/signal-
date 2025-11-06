"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstagramLabPage() {
  const router = useRouter();

  useEffect(() => {
    // デフォルトでフィードラボにリダイレクト
    router.replace("/instagram/lab/feed");
  }, [router]);

  return null;
}
