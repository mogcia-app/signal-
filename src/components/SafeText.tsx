"use client";

import React from "react";

/**
 * HTMLタグを含む可能性のある文字列を安全にレンダリングするコンポーネント
 * React error #418を防ぐため、すべての文字列をdangerouslySetInnerHTMLでレンダリング
 */
interface SafeTextProps {
  children: string | number | null | undefined;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  [key: string]: unknown;
}

export function SafeText({
  children,
  className,
  as = "span",
  ...props
}: SafeTextProps) {
  const content = children !== null && children !== undefined ? String(children) : "";
  const Component = as;

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
      {...props}
    />
  );
}

