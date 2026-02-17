import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contexts/auth-context";
import { ConditionalAuthGuard } from "../components/conditional-auth-guard";
import { ToastProvider } from "../components/toast-provider";
import { TopProgressBar } from "../components/top-progress-bar";
import { ProgressProvider } from "../contexts/progress-context";
import { OfflineStatusBanner } from "../components/offline-status-banner";

export const metadata: Metadata = {
  title: "Signal - ユーザーダッシュボード",
  description: "Signal利用者向けダッシュボード",
  icons: {
    icon: [
      { url: "/favicons/favicon-32.png", sizes: "32x32" },
      { url: "/favicons/favicon-64.png", sizes: "64x64" },
      { url: "/favicons/favicon.ico" },
    ],
    apple: "/favicons/favicon-180.png", // 128〜180px も作っておくと◎
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AuthProvider>
          <OfflineStatusBanner />
          <ProgressProvider>
            <TopProgressBar />
            <ToastProvider />
            <ConditionalAuthGuard>{children}</ConditionalAuthGuard>
          </ProgressProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
