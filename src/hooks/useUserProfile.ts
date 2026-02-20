import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile } from "../types/user";
import { useAuth } from "../contexts/auth-context";
import toast from "react-hot-toast";

export const useUserProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastNetworkErrorTimeRef = useRef<number>(0);
  const networkErrorToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 認証の読み込み中は待機
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", user.uid);

    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const userData = { id: doc.id, ...doc.data() } as UserProfile;
          setUserProfile(userData);
          setError(null);

          // snsCount を contractSNS の長さと一致させる
          const correctedUserData = {
            ...userData,
            snsCount: userData.contractSNS?.length || 0,
          };
          setUserProfile(correctedUserData);

          // 詳細なユーザープロフィール情報をコンソールに表示
          console.group("👤 Complete User Profile Data (Firestore)");
          console.log("📋 Basic Info:", {
            id: correctedUserData.id,
            email: correctedUserData.email,
            name: correctedUserData.name,
            role: correctedUserData.role,
            isActive: correctedUserData.isActive,
            status: correctedUserData.status,
            createdAt: correctedUserData.createdAt,
            updatedAt: correctedUserData.updatedAt,
          });
          console.log("📱 SNS Contract Info:", {
            snsCount: correctedUserData.snsCount,
            contractSNSLength: correctedUserData.contractSNS?.length,
            usageType: correctedUserData.usageType,
            contractType: correctedUserData.contractType,
            contractSNS: correctedUserData.contractSNS,
            contractStartDate: correctedUserData.contractStartDate,
            contractEndDate: correctedUserData.contractEndDate,
          });
          console.log("🏢 Business Info:", correctedUserData.businessInfo);
          console.log("⚙️ SNS AI Settings:", correctedUserData.snsAISettings);
          console.log("💰 Billing Info:", correctedUserData.billingInfo);
          console.log("📝 Notes:", correctedUserData.notes);
          console.log("📊 Complete Data Object:", correctedUserData);
          console.groupEnd();
        } else {
          // ユーザープロフィールが存在しない場合、完全なデフォルト値を設定
          const defaultUserProfile: UserProfile = {
            id: user.uid,
            email: user.email || "",
            name: user.displayName || "ユーザー",
            role: "user",
            isActive: true,
            snsCount: 1, // contractSNS.length と一致させる
            usageType: "solo",
            contractType: "trial",
            contractSNS: ["instagram"], // デフォルトでInstagramを契約
            snsAISettings: {
              instagram: {
                enabled: true,
                tone: "professional",
                features: ["hashtag-optimization", "content-suggestion", "analytics"],
              },
            },
            businessInfo: {
              industry: "IT・テクノロジー",
              companySize: "個人",
              businessType: "サービス業",
              description: "SNS運用・マーケティング",
              targetMarket: "20-30代",
              goals: ["フォロワー増加", "エンゲージメント向上"],
              challenges: ["コンテンツ作成", "投稿タイミング"],
            },
            status: "active",
            contractStartDate: new Date().toISOString(),
            contractEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
            billingInfo: {
              paymentMethod: "none",
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              amount: 0,
            },
            notes: "新規ユーザー",
            planTier: "basic", // デフォルトはベーシックプラン
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          console.group("🆕 Default User Profile Created");
          console.log("📊 Complete Default Data:", defaultUserProfile);
          console.groupEnd();
          setUserProfile(defaultUserProfile);
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        // ネットワーク関連のエラーは無視（一時的な接続問題の可能性が高い）
        const errorCode = (err as { code?: string })?.code;
        const errorMessage = (err as { message?: string })?.message || "";
        
        // ネットワーク関連のエラーは開発環境でのみログ出力
        const isNetworkError = 
          errorCode === "unavailable" ||
          errorMessage.includes("network") ||
          errorMessage.includes("disconnected") ||
          errorMessage.includes("QUIC") ||
          errorMessage.includes("ERR_INTERNET_DISCONNECTED") ||
          errorMessage.includes("ERR_NETWORK_IO_SUSPENDED");
        const isPermissionDenied = errorCode === "permission-denied";
        
        if (isNetworkError) {
          // ネットワークエラーは一時的なものなので、エラーを設定せずに既存のデータを保持
          if (process.env.NODE_ENV === "development") {
            console.warn("⚠️ Firestore接続エラー（ネットワーク）:", errorMessage);
          }
          
          // ネットワークエラーのトースト通知（30秒に1回まで）
          const now = Date.now();
          if (now - lastNetworkErrorTimeRef.current > 30000) {
            lastNetworkErrorTimeRef.current = now;
            
            // 既存のトーストがあれば削除
            if (networkErrorToastIdRef.current) {
              toast.dismiss(networkErrorToastIdRef.current);
            }
            
            // 新しいトーストを表示
            networkErrorToastIdRef.current = toast(
              "ネットワークが不安定です",
              {
                icon: "⚠️",
                duration: 5000,
                style: {
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fbbf24",
                },
              }
            );
          }
          
          // エラーを設定しない（既存のデータを保持）
          return;
        }

        if (isPermissionDenied) {
          if (process.env.NODE_ENV === "development") {
            console.warn("⚠️ Firestore権限エラーのためユーザー情報リアルタイム取得をスキップ:", errorMessage);
          }
          setLoading(false);
          return;
        }
        
        // その他のエラーのみログ出力
        if (process.env.NODE_ENV === "development") {
          console.error("❌ ユーザー情報の取得エラー:", err);
        }
        setError("ユーザー情報の取得に失敗しました");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  // ヘルパー関数
  const getContractSNS = () => {
    return userProfile?.contractSNS || [];
  };

  const getSNSAISettings = (snsName: string) => {
    return (userProfile?.snsAISettings as Record<string, unknown>)?.[snsName] || {};
  };

  const getSNSProfile = (_snsName: string) => {
    // snsProfilesは削除されたため、空オブジェクトを返す
    return {};
  };

  const getBusinessInfo = () => {
    return (
      userProfile?.businessInfo || {
        industry: "",
        companySize: "",
        businessType: "",
        description: "",
        targetMarket: "",
        goals: [],
        challenges: [],
      }
    );
  };

  const getBillingInfo = () => {
    return (
      userProfile?.billingInfo || {
        plan: "trial",
        paymentMethod: "none",
        nextBillingDate: "",
        amount: 0,
        currency: "JPY",
      }
    );
  };

  const isContractActive = () => {
    if (!userProfile) {return false;}
    const now = new Date();
    const endDate = new Date(userProfile.contractEndDate);
    return now < endDate && userProfile.status === "active";
  };

  const getContractDaysRemaining = () => {
    if (!userProfile) {return 0;}
    const now = new Date();
    const endDate = new Date(userProfile.contractEndDate);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return {
    userProfile,
    loading,
    error,
    // ヘルパー関数
    getContractSNS,
    getSNSAISettings,
    getSNSProfile,
    getBusinessInfo,
    getBillingInfo,
    isContractActive,
    getContractDaysRemaining,
  };
};
