import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types/user';
import { useAuth } from '../contexts/auth-context';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [user]);

  return { userProfile, loading, error };
};
