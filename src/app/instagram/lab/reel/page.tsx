"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ReelLabRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", "reel");
    const query = params.toString();
    router.replace(query ? `/instagram/lab?${query}` : "/instagram/lab");
  }, [router, searchParams]);

  return null;
}
