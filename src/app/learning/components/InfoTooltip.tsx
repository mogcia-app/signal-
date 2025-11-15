"use client";

import { useState } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        className="ml-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
        aria-label={text}
      >
        <Info className="h-4 w-4" />
      </button>
      {open ? (
        <span className="absolute z-20 left-1/2 top-6 -translate-x-1/2 w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600 shadow-lg">
          {text}
        </span>
      ) : null}
    </span>
  );
}

