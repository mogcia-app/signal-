"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { getToolMaintenanceStatus } from "@/lib/tool-maintenance";
import { authFetch } from "@/utils/authFetch";

const loginMaintenanceEnabled = process.env.NEXT_PUBLIC_LOGIN_MAINTENANCE === "true";
const isProductionBuild = process.env.NODE_ENV === "production";
const pageShellClassName = "relative min-h-screen overflow-hidden bg-white text-slate-900";
const centeredStateWrapperClassName =
  "mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-8 py-12 lg:px-12";
const panelClassName =
  "relative overflow-hidden border border-[#ffd3ac] bg-white shadow-[0_32px_90px_-48px_rgba(15,23,42,0.32)]";
const spinnerClassName =
  "h-14 w-14 animate-spin rounded-none border-4 border-[#ffd7b5] border-t-[#ff8a15]";

function LoadingState() {
  return (
    <div className={pageShellClassName}>
      <div className={centeredStateWrapperClassName}>
        <div className={`${panelClassName} w-full max-w-sm p-6 text-center`}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-[#fff2e8]">
            <div className={spinnerClassName}></div>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#ff8a15]">SIGNAL</p>
          <p className="mt-2 text-sm text-slate-600">読み込み中...</p>
        </div>
      </div>
    </div>
  );
}

function CenteredStatus({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={pageShellClassName}>
      <div className={centeredStateWrapperClassName}>
        <div className={`${panelClassName} w-full max-w-lg p-6 text-center sm:p-7`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-[#ff8a15]" />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-[#fff2e8] text-[#ff8a15]">
            {icon}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loginBlocked, setLoginBlocked] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const isMaintenanceMode = loginMaintenanceEnabled && !isProductionBuild;

  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const rawNext = searchParams.get("next");
    if (!rawNext) {
      return "/dashboard";
    }

    // open redirect防止: 相対パスのみ許可
    if (!rawNext.startsWith("/") || rawNext.startsWith("//")) {
      return "/dashboard";
    }

    return rawNext;
  }, [searchParams]);

  useEffect(() => {
    const blocked = searchParams.get("blocked");
    if (blocked === "1") {
      setError("現在ログインを一時停止しています。しばらくしてから再度お試しください。");
    }
  }, [searchParams]);

  // 既にログインしている場合は/homeにリダイレクト
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(nextPath);
    }
  }, [user, authLoading, router, nextPath]);

  // メンテナンス状態をチェック
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const status = await getToolMaintenanceStatus();
        const statusWithLoginBlocked = status as typeof status & { loginBlocked?: boolean };
        setMaintenanceMode(status.enabled);
        setMaintenanceMessage(status.message);
        setLoginBlocked(statusWithLoginBlocked.loginBlocked === true);

        // スケジュールされたメンテナンスのチェック
        if (status.scheduledStart && status.scheduledEnd) {
          const now = new Date();
          const start = new Date(status.scheduledStart);
          const end = new Date(status.scheduledEnd);

          if (now >= start && now <= end) {
            setMaintenanceMode(true);
            if (!status.message) {
              setMaintenanceMessage("システムメンテナンス中です。しばらくお待ちください。");
            }
          }
        }
      } catch (error) {
        console.error("Error checking maintenance status:", error);
        // エラー時はメンテナンス無効として扱う
        setMaintenanceMode(false);
      } finally {
        setCheckingMaintenance(false);
      }
    };

    checkMaintenance();

    // リアルタイムでメンテナンス状態を監視（30秒ごとにチェック）
    const interval = setInterval(checkMaintenance, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // メンテナンス中はログインをブロック
    if (maintenanceMode || isMaintenanceMode || loginBlocked) {
      setError("現在メンテナンス中です。しばらくお待ちください。");
      setLoading(false);
      return;
    }

    try {
      await signIn(email, password);
      void authFetch("/api/auth/login-events/success", {
        method: "POST",
        keepalive: true,
        body: JSON.stringify({
          source: "/login",
          currentPath: "/login",
          nextPath,
        }),
      }).catch(() => {
        // ログ送信失敗でログイン処理は失敗させない
      });
      setLoginSuccess(true);
      // 2秒後にホームページに遷移
      setTimeout(() => {
        router.replace(nextPath);
      }, 2000);
    } catch (error: unknown) {
      // 契約期間切れのエラーの場合
      const errorMessage = error instanceof Error ? error.message : "";
      const errorCode = (error as { code?: string })?.code;

      void fetch("/api/auth/login-events/failed", {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          errorCode: errorCode || "unknown",
          source: "/login",
          currentPath: "/login",
        }),
      }).catch(() => {
        // ログ送信失敗で画面挙動は変えない
      });

      if (errorMessage === "CONTRACT_EXPIRED" || errorCode === "auth/contract-expired") {
        setError("契約期間が終了しています。管理者にご連絡ください。");
      } else if (errorMessage === "NETWORK_OFFLINE") {
        setError("インターネット接続を確認してください。オフラインのようです。");
      } else if (errorCode === "auth/network-request-failed") {
        setError("ネットワークエラーが発生しました。インターネット接続とFirebaseサービスのステータスを確認してください。");
      } else if (errorCode === "auth/user-not-found" || errorCode === "auth/wrong-password") {
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else if (errorCode === "auth/invalid-email") {
        setError("無効なメールアドレスです。");
      } else if (errorCode === "auth/too-many-requests") {
        setError("ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。");
      } else {
        setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      }
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 認証状態のチェック中、または既にログインしている場合はローディング画面を表示
  if (authLoading || user) {
    return <LoadingState />;
  }

  // メンテナンスチェック中
  if (checkingMaintenance) {
    return <LoadingState />;
  }

  // メンテナンス画面
  if (maintenanceMode || isMaintenanceMode) {
    return (
      <CenteredStatus
        title="メンテナンス中"
        description={
          maintenanceMessage ||
          "システムメンテナンス中です。しばらくお待ちください。\nメンテナンスが完了次第、サービスを再開いたします。"
        }
        icon={<span className="text-4xl">🔧</span>}
      />
    );
  }

  if (loginBlocked) {
    return (
      <CenteredStatus
        title="ログイン一時停止中"
        description={
          maintenanceMessage ||
          "現在ログインを一時停止しています。しばらくしてから再度お試しください。\n復旧後にログイン可能になります。"
        }
        icon={<span className="text-4xl">🔒</span>}
      />
    );
  }

  // ログイン成功画面
  if (loginSuccess) {
    return (
      <div className={pageShellClassName}>
        <div className={centeredStateWrapperClassName}>
          <div className={`${panelClassName} w-full max-w-sm p-6 text-center`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-[#ff8a15]" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-[#ff8a15] text-white">
              <CheckCircle className="h-7 w-7" strokeWidth={2.4} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">ログイン成功</h2>
            <p className="mt-2 text-sm text-slate-600">Signal へようこそ。ダッシュボードへ移動しています。</p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffd7b5] border-t-[#ff8a15]" />
              ダッシュボードへ移動中...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageShellClassName}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-8 py-10 lg:px-12">
        <div className="grid w-full border border-slate-200 bg-white lg:grid-cols-[1.02fr_0.98fr]">
          <section className="flex min-h-[700px] flex-col justify-between border-b border-slate-200 bg-white px-10 py-10 sm:px-14 lg:min-h-[760px] lg:border-b-0 lg:border-r">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center border border-slate-300 bg-white p-3 shadow-[8px_8px_0_0_rgba(241,245,249,1)]">
                  <Image
                    src="/favicons/favicon-512.png"
                    alt="Signal logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    あなた専属のSNS運用アシスタント
                  </p>
                  <p className="mt-1.5 text-[32px] font-bold tracking-[0.06em] text-slate-900 sm:text-[40px]">
                    Signal<span className="text-[#ff8a15]">.</span>
                  </p>
                </div>
              </div>

              <div className="mt-20 max-w-[560px]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Overview</p>
                <h1 className="mt-6 text-[24px] font-bold leading-[1.3] tracking-tight text-slate-800 sm:text-[28px]">
                  分析から投稿の次の一手まで、
                  <br />
                  AIが提案
                </h1>
                <p className="mt-8 text-xl leading-10 text-slate-500">
                  投稿管理も改善のヒントも、ひとつの画面で
                </p>
              </div>
            </div>

            <div className="max-w-[560px] border-t border-slate-200 pt-8">
              <p className="text-lg leading-9 text-slate-500">
                迷わず進めるSNS運用へ
              </p>
            </div>
          </section>

          <section className="flex min-h-[700px] items-center justify-center bg-[#fafafa] px-10 py-10 lg:min-h-[760px]">
            <div className="w-full max-w-[520px] border border-slate-200 bg-white p-10 shadow-[12px_12px_0_0_rgba(241,245,249,1)]">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Sign in</p>
                <h2 className="mt-3 text-[34px] font-bold tracking-tight text-slate-800">ログイン</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  登録済みのメールアドレスとパスワードを入力してください
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
                    メールアドレス
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block h-14 w-full border border-slate-300 bg-white px-5 text-base font-medium text-slate-900 outline-none transition focus:border-[#ff8a15] focus:ring-4 focus:ring-[#ff8a15]/10"
                      placeholder="name@company.com"
                      style={{
                        WebkitBoxShadow: email ? "0 0 0 1000px rgb(255 255 255) inset" : undefined,
                        boxShadow: email ? "0 0 0 1000px rgb(255 255 255) inset" : undefined,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
                    パスワード
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block h-14 w-full border border-slate-300 bg-white px-5 pr-28 text-base font-medium text-slate-900 outline-none transition focus:border-[#ff8a15] focus:ring-4 focus:ring-[#ff8a15]/10"
                      placeholder="パスワードを入力"
                      style={{
                        WebkitBoxShadow: password ? "0 0 0 1000px rgb(255 255 255) inset" : undefined,
                        boxShadow: password ? "0 0 0 1000px rgb(255 255 255) inset" : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 inline-flex items-center gap-1.5 border-l border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-[#ff8a15] transition hover:bg-[#fff7f0] focus:outline-none focus:ring-4 focus:ring-[#ff8a15]/10"
                      aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showPassword ? "非表示" : "表示"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                    <div className="font-medium leading-6">{error}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-14 w-full items-center justify-center bg-[#ff8a15] px-6 text-lg font-bold text-white transition hover:bg-[#e97709] focus:outline-none focus:ring-4 focus:ring-[#ff8a15]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="mr-3 h-5 w-5 animate-spin rounded-none border-2 border-white/50 border-t-white" />
                      ログイン中...
                    </>
                  ) : (
                    "ログイン"
                  )}
                </button>

                <div className="border-t border-slate-200 pt-5 text-sm leading-7 text-slate-500">
                  パスワードを忘れた方は
                  <span className="ml-1 font-semibold text-[#ff8a15]">管理者に連絡してください</span>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px rgb(255 255 255) inset !important;
          box-shadow: 0 0 0 1000px rgb(255 255 255) inset !important;
          -webkit-text-fill-color: #0f172a !important;
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginPageContent />
    </Suspense>
  );
}
