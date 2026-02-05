import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/auth-context";
import { ConditionalAuthGuard } from "../components/conditional-auth-guard";
import { ToastProvider } from "../components/toast-provider";
import { TopProgressBar } from "../components/top-progress-bar";
import { ProgressProvider } from "../contexts/progress-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TopProgressBar />
        <AuthProvider>
          <ProgressProvider>
            <ToastProvider />
            <ConditionalAuthGuard>{children}</ConditionalAuthGuard>
          </ProgressProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
