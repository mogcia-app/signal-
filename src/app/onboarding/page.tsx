"use client";

import { useEffect } from "react";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  User,
  Mail,
  Calendar,
} from "lucide-react";
import SNSLayout from "../../components/sns-layout";

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { userProfile } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    // loading中はリダイレクトしない（Firebase初期化待ち）
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // 表示用の変換関数（英語キーを日本語に変換、既に日本語の場合はそのまま返す）
  const getIndustryLabel = (value: string) => {
    if (!value) {
      return "";
    }
    const map: Record<string, string> = {
      it: "IT・テクノロジー",
      retail: "小売・EC",
      food: "飲食",
      beauty: "美容・健康",
      education: "教育",
      realestate: "不動産",
      care: "介護・福祉",
      politics: "政治",
      other: "その他",
    };
    // 既に日本語の場合はそのまま返す
    if (map[value]) {
      return map[value];
    }
    // マップにない場合はそのまま返す（日本語で保存されている場合）
    return value;
  };

  const getCompanySizeLabel = (value: string) => {
    if (!value) {
      return "";
    }
    const map: Record<string, string> = {
      individual: "個人",
      small: "2-10名",
      medium: "11-50名",
      large: "51-200名",
      enterprise: "201名以上",
    };
    // 既に日本語の場合はそのまま返す
    if (map[value]) {
      return map[value];
    }
    // マップにない場合はそのまま返す（日本語で保存されている場合）
    return value;
  };

  const getBusinessTypeLabel = (value: string) => {
    if (!value) {
      return "";
    }
    const map: Record<string, string> = {
      btoc: "BtoC",
      btob: "BtoB",
      both: "BtoB/BtoC両方",
    };
    // 既に日本語の場合はそのまま返す
    if (map[value]) {
      return map[value];
    }
    // マップにない場合はそのまま返す（日本語で保存されている場合）
    return value;
  };

  // データ取得
  const businessInfo = userProfile?.businessInfo || ({} as {
    industry?: string;
    companySize?: string;
    businessType?: string;
    targetMarket?: string[];
    catchphrase?: string;
    description?: string;
    initialFollowers?: number;
    goals?: string[];
    challenges?: string[];
    productsOrServices?: Array<{ id: string; name: string; details: string; price?: string }>;
  });
  const goals = businessInfo.goals || [];
  const productsOrServices = businessInfo.productsOrServices || [];
  const snsAISettings = userProfile?.snsAISettings || ({} as {
    instagram?: {
      enabled: boolean;
      tone?: string;
      features?: string[];
      manner?: string;
      cautions?: string;
      goals?: string;
      motivation?: string;
      additionalInfo?: string;
    };
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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

  return (
    <SNSLayout
      customTitle="マイアカウント"
      customDescription="御社専用AIの設定情報を確認できます"
    >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
          {/* ユーザー情報セクション */}
          {userProfile && (
            <div className="mb-4 bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">ユーザー情報</h2>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1.5 text-xs font-medium ${
                      userProfile.status === "active"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-[#FF8A15] text-white"
                    }`}
                  >
                    {userProfile.status === "active" ? "✓ アクティブ" : "初期設定待ち"}
                  </span>
                  <span className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium bg-white">
                    {userProfile.contractType === "annual" ? "年間契約" : "トライアル"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* 名前 */}
                <div className="border border-gray-200 p-4 bg-white hover:border-gray-300 transition-colors">
                  <label className="flex items-center text-xs font-medium text-gray-500 mb-2">
                    <User className="h-3 w-3 mr-1 text-[#FF8A15]" />
                    名前
                  </label>
                  <p className="text-gray-900 font-medium text-base">{userProfile.name}</p>
                </div>

                {/* メールアドレス */}
                <div className="border border-gray-200 p-4 bg-white hover:border-gray-300 transition-colors">
                  <label className="flex items-center text-xs font-medium text-gray-500 mb-2">
                    <Mail className="h-3 w-3 mr-1 text-[#FF8A15]" />
                    メールアドレス
                  </label>
                  <p className="text-gray-900 font-medium text-sm break-all">{userProfile.email}</p>
                </div>

                {/* 契約期間 */}
                <div className="border border-gray-200 p-4 bg-white hover:border-gray-300 transition-colors">
                  <label className="flex items-center text-xs font-medium text-gray-500 mb-2">
                    <Calendar className="h-3 w-3 mr-1 text-[#FF8A15]" />
                    契約期間
                  </label>
                  <p className="text-gray-900 font-medium text-sm">
                    {new Date(userProfile.contractStartDate).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                    {" 〜 "}
                    {new Date(userProfile.contractEndDate).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* 契約SNS */}
              {userProfile.contractSNS && userProfile.contractSNS.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-xs font-medium text-gray-500 mb-3">契約SNS</label>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.contractSNS.map((sns) => (
                      <div
                        key={sns}
                        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <span className="text-lg">
                          {sns === "instagram"
                            ? "📷"
                            : sns === "x"
                              ? "🐦"
                              : sns === "tiktok"
                                ? "🎵"
                                : sns === "youtube"
                                  ? "📺"
                                  : "📱"}
                        </span>
                        <span className="font-medium text-gray-900 text-sm capitalize">
                          {sns === "x" ? "X (Twitter)" : sns}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* 御社専用AI設定 */}
            <div className="bg-white border border-gray-200 p-6">
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-[#FF8A15]" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">御社専用AI設定</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                  {businessInfo.industry
                    ? "adminで設定された情報を表示しています"
                    : "adminで設定された情報が表示されます"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* ビジネス情報 */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ビジネス情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">業種</label>
                    <p className="text-gray-900 font-medium">
                  {businessInfo.industry ? getIndustryLabel(businessInfo.industry) : "未設定"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">会社規模</label>
                    <p className="text-gray-900 font-medium">
                  {businessInfo.companySize ? getCompanySizeLabel(businessInfo.companySize) : "未設定"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">事業形態</label>
                    <p className="text-gray-900 font-medium">
                  {businessInfo.businessType ? getBusinessTypeLabel(businessInfo.businessType) : "未設定"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      ターゲット市場
                    </label>
                    <div className="flex flex-wrap gap-2">
                  {Array.isArray(businessInfo.targetMarket) && businessInfo.targetMarket.length > 0 ? (
                    businessInfo.targetMarket.map((market: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium"
                          >
                            {market}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-900">未設定</span>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      💬 キャッチコピー
                    </label>
                    <p className="text-gray-900 font-medium">{businessInfo.catchphrase || "未設定"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">事業内容</label>
                    <p className="text-gray-900">{businessInfo.description || "未設定"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      👥 利用開始日時点のフォロワー数
                    </label>
                    <p className="text-gray-900 font-medium">
                      {businessInfo.initialFollowers !== undefined && businessInfo.initialFollowers !== null
                    ? `${businessInfo.initialFollowers.toLocaleString()}人`
                        : "未設定"}
                    </p>
                  </div>
                </div>

                {/* 商品・サービス情報 */}
                {productsOrServices.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-3">
                      📦 商品・サービス情報
                    </label>
                    <div className="space-y-3">
                  {productsOrServices.map((item: { id: string; name: string; details: string; price?: string }) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🏷️</span>
                            <h4 className="font-medium text-gray-900 text-base">{item.name}</h4>
                            {item.price && (
                              <span className="text-black font-semibold text-sm ml-2">
                                {item.price}円（税込）
                              </span>
                            )}
                          </div>
                          {item.details && (
                            <p className="text-sm text-gray-700 mt-1 ml-7 mb-2">{item.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SNS活用の目的 */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">SNS活用の目的</h3>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  この目的は、あなたのビジネスがSNSで何を実現したいかを表す基本方針です。
                  月ごとに変わる具体的な目標は、運用計画ページで設定できます。
                </p>
                <div>
                  {goals.length > 0 ? (
                    <div className="p-4 border border-gray-200 bg-gray-50">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {goals.join("\n")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-900">未設定</p>
                  )}
                </div>
              </div>

              {/* 注意事項・NGワード */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">注意事項・NGワード</h3>
                <div>
                  {snsAISettings.instagram && "cautions" in snsAISettings.instagram && snsAISettings.instagram.cautions ? (
                    <div className="p-4 border border-gray-200 bg-gray-50">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {snsAISettings.instagram.cautions}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-900">未設定</p>
                  )}
                </div>
              </div>
          </div>
        </div>
    </SNSLayout>
  );
}
