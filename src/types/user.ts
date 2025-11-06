/**
 * ユーザー型定義
 * Admin Panelとの連携仕様に基づく
 */

export interface ProductOrService {
  id: string; // 一意のID
  name: string; // 商品名/サービス名/政策名
  details: string; // 詳細（価格、内容など）
}

export interface BusinessInfo {
  industry: string; // 業種
  companySize: string; // 会社規模
  businessType: string; // ビジネスタイプ
  description: string; // 事業内容
  targetMarket: string; // ターゲット市場
  catchphrase?: string; // キャッチコピー
  goals: string[]; // 目標
  challenges: string[]; // 課題
  productsOrServices?: ProductOrService[]; // 商品・サービス・政策情報
}

export interface BillingInfo {
  paymentMethod?: string; // 支払い方法
  lastPaymentDate?: string; // 最終支払日
  nextBillingDate?: string; // 次回請求日
  amount?: number; // 金額
}

export interface SNSAISettings {
  [snsType: string]: {
    enabled: boolean;
    tone?: string;
    features?: string[];
  };
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string; // ログイン用メールアドレス
  name: string; // 表示名
  role: "user" | "admin"; // 権限（利用者は'user'）
  isActive: boolean; // アクティブ状態
  snsCount: number; // SNS契約数（1-4）
  usageType: "team" | "solo"; // 利用形態
  contractType: "annual" | "trial"; // 契約タイプ
  contractSNS: string[]; // 契約SNS配列
  snsAISettings: SNSAISettings; // SNS AI設定
  businessInfo: BusinessInfo; // ビジネス情報
  status: "active" | "inactive" | "suspended" | "pending_setup"; // ステータス
  contractStartDate: string; // 契約開始日
  contractEndDate: string; // 契約終了日
  billingInfo?: BillingInfo; // 課金情報
  notes?: string; // 管理者メモ
  setupRequired?: boolean; // 初期設定が必要かどうか
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
}

// プロフィール更新用の型（一部のフィールドのみ更新可能）
export interface UserProfileUpdate {
  name?: string;
  businessInfo?: Partial<BusinessInfo>;
  snsAISettings?: SNSAISettings;
}
