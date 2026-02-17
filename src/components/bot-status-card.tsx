"use client";

import { Bot } from "lucide-react";

interface BotStatusCardProps {
  title: string;
  subtitle?: string;
  progress: number;
  compact?: boolean;
  large?: boolean;
  borderless?: boolean;
}

export function BotStatusCard({
  title,
  subtitle,
  progress,
  compact = false,
  large = false,
  borderless = false,
}: BotStatusCardProps) {
  const safeProgress = Math.max(0, Math.min(100, progress));
  const containerPadding = large ? "p-8" : compact ? "p-2.5" : "p-3.5";
  const iconWrapSize = large ? "h-14 w-14" : "h-7 w-7";
  const iconSize = large ? "h-8 w-8" : "h-4 w-4";
  const titleClass = large ? "text-2xl font-semibold" : "text-xs font-semibold";
  const subtitleClass = large ? "mt-1 text-base text-gray-600" : "mt-0.5 text-[11px] text-gray-600";
  const barClass = large ? "mt-4 h-4" : "mt-2 h-2";
  const percentClass = large ? "mt-2 text-sm text-gray-500" : "mt-1 text-[11px] text-gray-500";
  const containerClass = `rounded-none ${borderless ? "" : "border border-orange-200"} bg-white ${borderless ? "" : "shadow-sm"} ${containerPadding}`;

  return (
    <div className={containerClass}>
      <div className={large ? "flex flex-col items-center text-center" : "flex items-start gap-2.5"}>
        <span className={`inline-flex ${iconWrapSize} flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600`}>
          <Bot className={iconSize} />
        </span>
        <div className={large ? "mt-3 w-full max-w-3xl" : "min-w-0 flex-1"}>
          <p className={`${titleClass} text-gray-900`}>{title}</p>
          {subtitle && <p className={subtitleClass}>{subtitle}</p>}
          <div className={`${barClass} w-full overflow-hidden border border-gray-200 bg-gray-100`}>
            <div
              className="h-full bg-gradient-to-r from-[#FF8A15] to-orange-500 transition-all duration-300"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <p className={percentClass}>{Math.round(safeProgress)}%</p>
        </div>
      </div>
    </div>
  );
}
