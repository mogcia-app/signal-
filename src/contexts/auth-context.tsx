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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        try {
          await ensureUserDocument(user);
        } catch (error) {
          console.error('Error ensuring user document:', error);
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

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
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

