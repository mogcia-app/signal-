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
          
          // 開発環境でユーザープロフィール情報をコンソールに表示
          if (process.env.NODE_ENV === 'development') {
            console.group('👤 User Profile Info (Firestore)');
            console.log('📋 Basic Info:', {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              isActive: userData.isActive,
              status: userData.status
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
            console.log('💰 Billing Info:', userData.billingInfo);
            console.log('📝 Notes:', userData.notes);
            console.groupEnd();
          }
        } else {
          setUserProfile(null);
          setError('ユーザー情報が見つかりません');
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

  return { userProfile, loading, error };
};
