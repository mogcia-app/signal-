/**
 * スケルトンローディングコンポーネント
 */

import React from "react";

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}

export function SkeletonLoader({
  className = "",
  count = 1,
  height = "1rem",
  width = "100%",
}: SkeletonLoaderProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gray-200 rounded ${className}`}
          style={{ height, width }}
        />
      ))}
    </>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <SkeletonLoader height="1.5rem" width="40%" className="mb-4" />
      <SkeletonLoader height="1rem" width="100%" className="mb-2" />
      <SkeletonLoader height="1rem" width="80%" className="mb-2" />
      <SkeletonLoader height="1rem" width="60%" />
    </div>
  );
}

interface SkeletonPostCardProps {
  className?: string;
}

export function SkeletonPostCard({ className = "" }: SkeletonPostCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-start gap-4">
        <SkeletonLoader height="80px" width="80px" className="rounded" />
        <div className="flex-1">
          <SkeletonLoader height="1.25rem" width="60%" className="mb-2" />
          <SkeletonLoader height="1rem" width="100%" className="mb-1" />
          <SkeletonLoader height="1rem" width="80%" className="mb-3" />
          <div className="flex gap-2">
            <SkeletonLoader height="1.5rem" width="4rem" className="rounded" />
            <SkeletonLoader height="1.5rem" width="4rem" className="rounded" />
            <SkeletonLoader height="1.5rem" width="4rem" className="rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SkeletonKPICardProps {
  className?: string;
}

export function SkeletonKPICard({ className = "" }: SkeletonKPICardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <SkeletonLoader height="1.5rem" width="50%" className="mb-4" />
      <SkeletonLoader height="2rem" width="30%" className="mb-2" />
      <SkeletonLoader height="1rem" width="60%" />
    </div>
  );
}

