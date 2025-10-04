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
};

export default nextConfig;
