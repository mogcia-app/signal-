import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Ignore TypeScript errors in functions directory during build
    ignoreBuildErrors: false,
  },
  // Exclude functions directory from Next.js compilation
  experimental: {
    externalDir: true,
  },
  // React Server Components の設定
  reactStrictMode: true,
  // APIルートの静的生成を無効化
  output: 'standalone',
  // 静的生成を無効化してAPIルートの問題を回避
  trailingSlash: false,
};

export default nextConfig;
