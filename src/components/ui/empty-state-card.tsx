"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type EmptyStateTone = "neutral" | "info" | "warning" | "danger";

export interface EmptyStateAction {
  label: string;
  href: string;
  external?: boolean;
}

export interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: EmptyStateTone;
  align?: "center" | "left";
  actions?: EmptyStateAction[];
  children?: ReactNode;
}

const toneStyles: Record<
  EmptyStateTone,
  { container: string; icon: string; title: string; body: string }
> = {
  neutral: {
    container: "border border-dashed border-gray-300 bg-gray-50",
    icon: "text-slate-400",
    title: "text-slate-900",
    body: "text-slate-600",
  },
  info: {
    container: "border border-dashed border-amber-200 bg-amber-50",
    icon: "text-amber-500",
    title: "text-slate-900",
    body: "text-slate-600",
  },
  warning: {
    container: "border border-dashed border-amber-300 bg-amber-50",
    icon: "text-amber-500",
    title: "text-amber-900",
    body: "text-amber-700",
  },
  danger: {
    container: "border border-dashed border-red-300 bg-red-50",
    icon: "text-red-500",
    title: "text-red-900",
    body: "text-red-700",
  },
};

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  tone = "neutral",
  align = "center",
  actions,
  children,
}: EmptyStateCardProps) {
  const styles = toneStyles[tone];
  const alignment = align === "left" ? "text-left" : "text-center";
  const actionAlignment = align === "left" ? "justify-start" : "justify-center";

  return (
    <div className={`rounded-none p-6 ${styles.container} ${alignment}`}>
      <div className={`flex ${actionAlignment} mb-3`}>
        <Icon className={`h-8 w-8 ${styles.icon}`} />
      </div>
      <h3 className={`text-base font-semibold mb-2 ${styles.title}`}>{title}</h3>
      <p className={`text-sm mb-3 leading-relaxed ${styles.body}`}>{description}</p>
      {children ? <div className="text-xs text-slate-500 leading-relaxed">{children}</div> : null}
      {actions?.length ? (
        <div className={`mt-4 flex flex-wrap gap-3 ${actionAlignment}`}>
          {actions.map(({ label, href, external }) =>
            external ? (
              <a
                key={`${label}-${href}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 transition-colors rounded-none"
              >
                {label}
              </a>
            ) : (
              <Link
                key={`${label}-${href}`}
                href={href}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 transition-colors rounded-none"
              >
                {label}
              </Link>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}


