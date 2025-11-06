import { useUserProfile } from "./useUserProfile";

export type SNSSettings = Record<string, Record<string, unknown>>;

export const useSNSSettings = () => {
  const { userProfile, loading, error } = useUserProfile();

  const snsSettings: SNSSettings = (userProfile?.snsAISettings as SNSSettings) || {};

  // デフォルトでTikTokとYouTubeを追加（写真撮り用）
  const defaultSNS = ["instagram", "tiktok", "youtube", "x"];
  const snsNames = Object.keys(snsSettings).length > 0 ? Object.keys(snsSettings) : defaultSNS;
  const hasSettings = snsNames.length > 0;

  // 特定のSNS設定を取得する関数
  const getSNSSettings = (snsName: string) => {
    return snsSettings[snsName] || {};
  };

  // 契約SNSとの整合性チェック
  const contractSNS = userProfile?.contractSNS || [];
  const hasMismatch =
    snsNames.length > 0 &&
    contractSNS.length > 0 &&
    !snsNames.every((sns) => contractSNS.includes(sns));

  return {
    snsSettings,
    snsNames,
    hasSettings,
    getSNSSettings,
    contractSNS,
    hasMismatch,
    loading,
    error,
  };
};
