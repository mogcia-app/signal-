"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PlanRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/instagram/plan");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-[#FF8A15] animate-spin" />
    </div>
  );
}

