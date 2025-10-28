'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types/user';
import { checkUserContract } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  contractValid: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractValid, setContractValid] = useState(false);

  // ユーザードキュメントを作成または更新する関数
  const ensureUserDocument = async (user: User) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // ユーザードキュメントが存在しない場合、デフォルト値で作成
      const defaultUserProfile: Omit<UserProfile, 'id'> & { setupRequired?: boolean } = {
        email: user.email || '',
        name: user.displayName || 'ユーザー',
        role: 'user',
        isActive: true,
        snsCount: 1,
        usageType: 'solo',
        contractType: 'trial',
        contractSNS: ['instagram'],
        snsAISettings: {},
        businessInfo: {
          industry: '',
          companySize: '',
          businessType: '',
          description: '',
          targetMarket: '',
          goals: [],
          challenges: []
        },
        status: 'pending_setup',
        setupRequired: true,
        contractStartDate: new Date().toISOString(),
        contractEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        billingInfo: {
          paymentMethod: 'none',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 0
        },
        notes: '新規ユーザー - 初期設定待ち',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(userDocRef, defaultUserProfile);
      console.log('✅ User document created in Firestore:', user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // ユーザーがログインしている場合、Firestoreドキュメントを確認・作成
      if (user) {
        // セッション開始時刻を記録
        if (typeof window !== 'undefined') {
          const existingSession = localStorage.getItem('signal_session_start');
          if (!existingSession) {
            localStorage.setItem('signal_session_start', Date.now().toString());
          }
        }
        
        try {
          await ensureUserDocument(user);
          
          // 契約期間をチェック
          const isValid = await checkUserContract(user.uid);
          setContractValid(isValid);
          
          if (!isValid) {
            // 契約が無効な場合、ログアウト処理
            if (process.env.NODE_ENV === 'development') {
              console.warn('🚫 Contract invalid. User will be logged out.');
            }
            if (typeof window !== 'undefined') {
              alert('契約期間が終了しています。管理者にご連絡ください。');
              localStorage.removeItem('signal_session_start');
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error ensuring user document:', error);
          }
          setContractValid(false);
        }
      } else {
        setContractValid(false);
        // ログアウト時はセッション情報をクリア
        if (typeof window !== 'undefined') {
          localStorage.removeItem('signal_session_start');
        }
      }
      
      setLoading(false);
      
      // 開発環境で認証情報をコンソールに表示
      if (process.env.NODE_ENV === 'development') {
        console.group('🔐 Firebase Authentication Info');
        if (user) {
          console.log('✅ User Authenticated:', {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
            isAnonymous: user.isAnonymous,
            providerData: user.providerData,
            metadata: {
              creationTime: user.metadata.creationTime,
              lastSignInTime: user.metadata.lastSignInTime
            }
          });
          console.log('📱 Access Token:', 'Not directly accessible from User object');
          console.log('🔄 Refresh Token:', 'Not directly accessible from User object');
        } else {
          console.log('❌ No user authenticated');
        }
        console.groupEnd();
      }
    });

    return () => unsubscribe();
  }, []);

  // 6時間で自動ログアウト機能
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const checkSessionTimeout = () => {
      const sessionStart = localStorage.getItem('signal_session_start');
      
      if (sessionStart) {
        const sessionStartTime = parseInt(sessionStart, 10);
        const currentTime = Date.now();
        const elapsedTime = currentTime - sessionStartTime;
        const sixHoursInMs = 6 * 60 * 60 * 1000; // 6時間
        
        if (elapsedTime >= sixHoursInMs) {
          // 6時間経過したら自動ログアウト
          firebaseSignOut(auth);
          localStorage.removeItem('signal_session_start');
          
          if (typeof window !== 'undefined') {
            alert('セッションがタイムアウトしました。再度ログインしてください。');
          }
        }
      }
    };

    // 初回チェック
    checkSessionTimeout();

    // 5分ごとにチェック
    const intervalId = setInterval(checkSessionTimeout, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      // まずFirebase認証を実行
      await signInWithEmailAndPassword(auth, email, password);
      
      // 認証成功後、現在のユーザーを取得
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // 契約期間をチェック
        const isValid = await checkUserContract(currentUser.uid);
        
        if (!isValid) {
          // 契約が無効な場合はログアウト
          await firebaseSignOut(auth);
          throw new Error('CONTRACT_EXPIRED');
        }
        
        // ログイン成功時、セッション開始時刻を記録
        if (typeof window !== 'undefined') {
          localStorage.setItem('signal_session_start', Date.now().toString());
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Sign in error:', error);
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      
      // セッション情報をクリア
      if (typeof window !== 'undefined') {
        localStorage.removeItem('signal_session_start');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Sign out error:', error);
      }
      throw error;
    }
  };

  const value = {
    user,
    loading,
    contractValid,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

