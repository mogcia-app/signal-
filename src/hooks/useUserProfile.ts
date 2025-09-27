import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types/user';
import { useAuth } from '../contexts/auth-context';

export const useUserProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const userDocRef = doc(db, 'users', user.uid);
    
    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const userData = { id: doc.id, ...doc.data() } as User;
          setUserProfile(userData);
          setError(null);
          
          // 詳細なユーザープロフィール情報をコンソールに表示
          console.group('👤 Complete User Profile Data (Firestore)');
          console.log('📋 Basic Info:', {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            isActive: userData.isActive,
            status: userData.status,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt
          });
          console.log('📱 SNS Contract Info:', {
            snsCount: userData.snsCount,
            usageType: userData.usageType,
            contractType: userData.contractType,
            contractSNS: userData.contractSNS,
            contractStartDate: userData.contractStartDate,
            contractEndDate: userData.contractEndDate
          });
          console.log('🏢 Business Info:', userData.businessInfo);
          console.log('⚙️ SNS AI Settings:', userData.snsAISettings);
          console.log('👥 SNS Profiles:', userData.snsProfiles);
          console.log('💰 Billing Info:', userData.billingInfo);
          console.log('📝 Notes:', userData.notes);
          console.log('📊 Complete Data Object:', userData);
          console.groupEnd();
        } else {
          // ユーザープロフィールが存在しない場合、完全なデフォルト値を設定
          const defaultUserProfile: User = {
            id: user.uid,
            email: user.email || '',
            name: user.displayName || 'ユーザー',
            role: 'user',
            isActive: true,
            snsCount: 1,
            usageType: 'solo',
            contractType: 'trial',
            contractSNS: ['instagram'], // デフォルトでInstagramを契約
            snsAISettings: {
              instagram: {
                aiEnabled: true,
                autoPosting: false,
                hashtagOptimization: true,
                contentSuggestion: true,
                postingFrequency: 'daily',
                optimalPostingTime: ['09:00', '18:00'],
                contentTypes: ['feed', 'reel', 'story'],
                analyticsEnabled: true,
                engagementTracking: true,
                competitorAnalysis: false
              }
            },
            snsProfiles: {
              instagram: {
                followers: 0,
                username: '',
                lastUpdated: new Date().toISOString()
              }
            },
            businessInfo: {
              industry: 'IT・テクノロジー',
              companySize: '個人',
              businessType: 'サービス業',
              description: 'SNS運用・マーケティング',
              targetMarket: '20-30代',
              goals: ['フォロワー増加', 'エンゲージメント向上'],
              challenges: ['コンテンツ作成', '投稿タイミング']
            },
            status: 'active',
            contractStartDate: new Date().toISOString(),
            contractEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
            billingInfo: {
              plan: 'trial',
              paymentMethod: 'none',
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              amount: 0,
              currency: 'JPY'
            },
            notes: '新規ユーザー',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          console.group('🆕 Default User Profile Created');
          console.log('📊 Complete Default Data:', defaultUserProfile);
          console.groupEnd();
          setUserProfile(defaultUserProfile);
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('ユーザー情報の取得エラー:', err);
        setError('ユーザー情報の取得に失敗しました');
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

  const getSNSProfile = (snsName: string) => {
    return (userProfile?.snsProfiles as Record<string, unknown>)?.[snsName] || {};
  };

  const getBusinessInfo = () => {
    return userProfile?.businessInfo || {
      industry: '',
      companySize: '',
      businessType: '',
      description: '',
      targetMarket: '',
      goals: [],
      challenges: []
    };
  };

  const getBillingInfo = () => {
    return userProfile?.billingInfo || {
      plan: 'trial',
      paymentMethod: 'none',
      nextBillingDate: '',
      amount: 0,
      currency: 'JPY'
    };
  };

  const isContractActive = () => {
    if (!userProfile) return false;
    const now = new Date();
    const endDate = new Date(userProfile.contractEndDate);
    return now < endDate && userProfile.status === 'active';
  };

  const getContractDaysRemaining = () => {
    if (!userProfile) return 0;
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
    getContractDaysRemaining
  };
};
