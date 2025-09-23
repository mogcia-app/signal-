// ユーザー情報の型定義
export interface User {
  id: string; // Firebase Auth UID
  email: string; // ログイン用メールアドレス（Firebase Auth管理）
  name: string; // 表示名
  role: 'user' | 'admin'; // 権限（利用者は'user'）
  isActive: boolean; // アクティブ状態
  snsCount: number; // SNS契約数（1-4）
  usageType: 'team' | 'solo'; // 利用形態
  contractType: 'annual' | 'trial'; // 契約タイプ
  contractSNS: string[]; // 契約SNS配列
  snsAISettings: Record<string, unknown>; // SNS AI設定
  snsProfiles?: {
    instagram?: {
      followers: number;
      username?: string;
      lastUpdated?: string;
    };
    tiktok?: {
      followers: number;
      username?: string;
      lastUpdated?: string;
    };
    twitter?: {
      followers: number;
      username?: string;
      lastUpdated?: string;
    };
    youtube?: {
      subscribers: number;
      username?: string;
      lastUpdated?: string;
    };
  };
  businessInfo: {
    industry: string;
    companySize: string;
    businessType: string;
    description: string;
    targetMarket: string;
    goals: string[];
    challenges: string[];
  };
  status: 'active' | 'inactive' | 'suspended';
  contractStartDate: string; // 契約開始日
  contractEndDate: string; // 契約終了日
  billingInfo?: Record<string, unknown>; // 課金情報
  notes?: string; // 管理者メモ
  createdAt: string;
  updatedAt: string;
}
