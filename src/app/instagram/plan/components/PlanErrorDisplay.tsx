/**
 * エラー表示コンポーネント
 */

import React from "react";
import { usePlanStore } from "@/stores/plan-store";

export function PlanErrorDisplay() {
  const error = usePlanStore((state) => state.error);

  if (!error) return null;

  return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-800">{error}</p>
    </div>
  );
}

