"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/auth-context";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { getToolMaintenanceStatus } from "@/lib/tool-maintenance";

const loginMaintenanceEnabled = process.env.NEXT_PUBLIC_LOGIN_MAINTENANCE === "true";
const isProductionBuild = process.env.NODE_ENV === "production";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const isMaintenanceMode = loginMaintenanceEnabled && !isProductionBuild;

  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // 既にログインしている場合は/homeにリダイレクト
  // 未ログインの場合はポータルサイトにリダイレクト
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        router.push("/home");
      } else {
        window.location.href = "https://signal-portal.vercel.app/";
      }
    }
  }, [user, authLoading, router]);

  // メンテナンス状態をチェック
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const status = await getToolMaintenanceStatus();
        setMaintenanceMode(status.enabled);
        setMaintenanceMessage(status.message);

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
    if (maintenanceMode || isMaintenanceMode) {
      setError("現在メンテナンス中です。しばらくお待ちください。");
      setLoading(false);
      return;
    }

    try {
      await signIn(email, password);
      setLoginSuccess(true);
      // 2秒後にホームページに遷移
      setTimeout(() => {
        router.push("/home");
      }, 2000);
    } catch (error: unknown) {
      // 契約期間切れのエラーの場合
      const errorMessage = error instanceof Error ? error.message : "";
      const errorCode = (error as { code?: string })?.code;

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  // メンテナンスチェック中
  if (checkingMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  // メンテナンス画面
  if (maintenanceMode || isMaintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10 p-4 relative overflow-hidden">
        {/* グリッドパターン */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        ></div>

        <div className="relative max-w-md w-full bg-white border-2 border-gray-900 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold mb-4">メンテナンス中</h1>
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">
            {maintenanceMessage || "システムメンテナンス中です。しばらくお待ちください。"}
          </p>
          <div className="text-sm text-gray-500">
            メンテナンスが完了次第、サービスを再開いたします。
          </div>
        </div>
      </div>
    );
  }

  // ログイン成功画面
  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10 p-4 relative overflow-hidden">
        {/* グリッドパターン */}
        <div 
          className="absolute inset-0 opacity-[0.08]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        ></div>

        <div className="relative max-w-md w-full space-y-4 text-center animate-fade-in">
          {/* 成功アイコン */}
          <div className="mx-auto w-16 h-16 bg-[#ff8a15] border-2 border-gray-900 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>

          {/* タイトルとローディング */}
          <div className="bg-white border-2 border-gray-900 p-8 shadow-[8px_8px_0_0_#000] space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-black">
                ログイン成功
              </h2>
              <p className="text-base text-gray-700">
                <span className="font-bold">Signal</span>
                <span className="text-[#ff8a15]">.</span>
                へようこそ
              </p>
            </div>

            {/* ローディングインジケーター */}
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-900 border-t-[#ff8a15] animate-spin"></div>
              </div>
              <p className="text-sm text-black font-medium">ダッシュボードへ移動中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10 p-4 relative overflow-hidden">
      {/* グリッドパターン */}
      <div 
        className="absolute inset-0 opacity-[0.08]" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      ></div>

      <div className="relative max-w-md w-full space-y-2 animate-fade-in">
        {/* ロゴ・タイトルセクション */}
        <div className="text-center mb-4">
          <div className="inline-block border-2 border-gray-900 bg-white px-8 py-3">
            <h1 className="text-4xl font-bold text-black tracking-tight">
              Signal<span className="text-[#ff8a15]">.</span>
            </h1>
          </div>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white border-2 border-gray-900 p-8 shadow-[8px_8px_0_0_#000] hover:shadow-[12px_12px_0_0_#ff8a15] transition-all duration-300">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* メールアドレス入力 */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-black">
                メールアドレス
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#ff8a15] transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-900 bg-white text-black placeholder-gray-400 focus:outline-none focus:border-[#ff8a15] focus:bg-[#ff8a15]/5 transition-all duration-200 font-medium autofill:bg-[#ff8a15]/5 autofill:text-black"
                  placeholder="your@email.com"
                  style={{
                    WebkitBoxShadow: email ? '0 0 0 1000px rgb(255 138 21 / 0.05) inset' : undefined,
                    boxShadow: email ? '0 0 0 1000px rgb(255 138 21 / 0.05) inset' : undefined,
                  }}
                />
              </div>
            </div>

            {/* パスワード入力 */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-black">
                パスワード
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#ff8a15] transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 border-2 border-gray-900 bg-white text-black placeholder-gray-400 focus:outline-none focus:border-[#ff8a15] focus:bg-[#ff8a15]/5 transition-all duration-200 font-medium autofill:bg-[#ff8a15]/5 autofill:text-black"
                  placeholder="パスワードを入力"
                  style={{
                    WebkitBoxShadow: password ? '0 0 0 1000px rgb(255 138 21 / 0.05) inset' : undefined,
                    boxShadow: password ? '0 0 0 1000px rgb(255 138 21 / 0.05) inset' : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#ff8a15] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border-2 border-red-500 p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            {/* ログインボタン */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-4 px-6 border-2 border-gray-900 text-lg font-bold text-white bg-[#ff8a15] hover:bg-black hover:border-[#ff8a15] focus:outline-none focus:ring-4 focus:ring-[#ff8a15]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#ff8a15] active:shadow-[2px_2px_0_0_#ff8a15] active:translate-x-[2px] active:translate-y-[2px] transform"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent mr-3"></div>
                    ログイン中...
                  </>
                ) : (
                  <>
                    ログイン
                    <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
                  </>
                )}
              </button>
            </div>

            

            {/* 注意事項 */}
            <div className="text-center">
              <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 p-3 font-medium">
                <span className="text-[#ff8a15] font-bold">※</span>{" "}
              パスワードを忘れた方は管理者に連絡してください
              </p>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px rgb(255 138 21 / 0.05) inset !important;
          box-shadow: 0 0 0 1000px rgb(255 138 21 / 0.05) inset !important;
          -webkit-text-fill-color: #000 !important;
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}
