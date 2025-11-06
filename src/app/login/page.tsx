"use client";

import { useState } from "react";
import { useAuth } from "../../contexts/auth-context";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      setLoginSuccess(true);
      // 2秒後にフィード（ラボ）に遷移
      setTimeout(() => {
        router.push("/instagram/lab/feed");
      }, 2000);
    } catch (error: unknown) {
      // 契約期間切れのエラーの場合
      const errorMessage = error instanceof Error ? error.message : "";
      const errorCode = (error as { code?: string })?.code;

      if (errorMessage === "CONTRACT_EXPIRED" || errorCode === "auth/contract-expired") {
        setError("契約期間が終了しています。管理者にご連絡ください。");
      } else if (errorCode === "auth/user-not-found" || errorCode === "auth/wrong-password") {
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else if (errorCode === "auth/invalid-email") {
        setError("無効なメールアドレスです。");
      } else {
        setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      }
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ログイン成功画面
  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-3">
              ログイン成功！
            </h2>
            <p className="text-black text-lg">ダッシュボードに移動しています...</p>
            <div className="mt-8">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-500 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 p-4">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-200 to-orange-300 rounded-full opacity-15 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-200 to-orange-300 rounded-full opacity-15 blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full space-y-8">
        {/* ロゴ・タイトルセクション */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <img src="/favicon.png" alt="Signal Logo" className="w-14 h-14" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-2">
            Signal<span className="text-[#ff8a15]">.</span>
          </h1>
          <p className="text-black text-lg">アカウントにログイン</p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* メールアドレス入力 */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                メールアドレス
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-orange-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* パスワード入力 */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                パスワード
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-orange-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50"
                  placeholder="パスワードを入力"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-black hover:text-orange-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* ログインボタン */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    ログイン中...
                  </>
                ) : (
                  "ログイン"
                )}
              </button>
            </div>

            {/* 注意事項 */}
            <div className="text-center">
              <p className="text-sm text-black bg-orange-50 rounded-lg p-3 border border-orange-100">
                <span className="font-medium text-orange-700">※</span>{" "}
                管理者によって登録されたメールアドレスでのみログイン可能です
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
      `}</style>
    </div>
  );
}
