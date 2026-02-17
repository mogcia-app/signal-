import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Ignore TypeScript errors in functions directory during build
    ignoreBuildErrors: false,
  },
  // Exclude functions directory from Next.js compilation
  // Vercelでは externalDir を無効化（Vercel環境でない場合のみ有効化）
  experimental: {
    ...(process.env.VERCEL ? {} : { externalDir: true }),
  },
  // React Server Components の設定
  reactStrictMode: true,
  // Vercelでは standalone 出力を無効化（Vercel環境でない場合のみ有効化）
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  // 静的生成を無効化してAPIルートの問題を回避
  trailingSlash: false,
  // 本番環境でconsole文を削除する設定
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"], // error と warn は残す
          }
        : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "mogcia",
  project: "javascript-nextjs",
});
