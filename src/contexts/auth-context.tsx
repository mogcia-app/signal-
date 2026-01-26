"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, DocumentReference } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserProfile } from "../types/user";
import { checkUserContract } from "../lib/auth";
import { installAuthFetch } from "../utils/installAuthFetch";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  contractValid: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractValid, setContractValid] = useState(false);

  useEffect(() => {
    installAuthFetch();
  }, []);

  // ユーザードキュメントを作成または更新する関数
  const ensureUserDocument = async (user: User) => {
    const userDocRef = doc(db, "users", user.uid);
    
    try {
      // まず存在確認を試みる
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // ユーザードキュメントが存在しない場合、デフォルト値で作成
        await createUserDocument(userDocRef, user);
      }
    } catch (error: unknown) {
      // 権限エラーが発生した場合（新規ユーザーでドキュメントが存在しない場合など）
      // 直接作成を試みる（create権限はルールで許可されている）
      interface FirebaseError extends Error {
        code?: string;
      }
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'permission-denied') {
        try {
          await createUserDocument(userDocRef, user);
        } catch (createError) {
          console.error("🔐 Error creating user document:", createError);
          throw createError;
        }
      } else {
        console.error("🔐 Error ensuring user document:", error);
        throw error;
      }
    }
  };

  // ユーザードキュメント作成のヘルパー関数
  const createUserDocument = async (userDocRef: DocumentReference, user: User) => {
    const defaultUserProfile: Omit<UserProfile, "id"> & { setupRequired?: boolean } = {
      email: user.email || "",
      name: user.displayName || "ユーザー",
      role: "user",
      isActive: true,
      snsCount: 1,
      usageType: "solo",
      contractType: "trial",
      contractSNS: ["instagram"],
      snsAISettings: {},
      businessInfo: {
        industry: "",
        companySize: "",
        businessType: "",
        description: "",
        targetMarket: "",
        goals: [],
        challenges: [],
      },
      status: "pending_setup",
      setupRequired: true,
      contractStartDate: new Date().toISOString(),
      contractEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      billingInfo: {
        paymentMethod: "none",
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 0,
      },
      notes: "新規ユーザー - 初期設定待ち",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userDocRef, defaultUserProfile);
    console.log("✅ User document created in Firestore:", user.uid);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // ユーザーがログインしている場合、Firestoreドキュメントを確認・作成
      if (user) {
        // セッション開始時刻を記録
        if (typeof window !== "undefined") {
          const existingSession = localStorage.getItem("signal_session_start");
          if (!existingSession) {
            localStorage.setItem("signal_session_start", Date.now().toString());
          }
        }

        try {
          await ensureUserDocument(user);

          // 契約期間をチェック
          const isValid = await checkUserContract(user.uid);
          setContractValid(isValid);

          if (!isValid) {
            // 契約が無効な場合、ログアウト処理
            if (process.env.NODE_ENV === "development") {
              console.warn("🚫 Contract invalid. User will be logged out.");
            }
            if (typeof window !== "undefined") {
              localStorage.removeItem("signal_session_start");
              // ログイン画面に自動リダイレクト
              router.push("/login");
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Error ensuring user document:", error);
          }
          setContractValid(false);
        }
      } else {
        setContractValid(false);
        // ログアウト時はセッション情報をクリア
        if (typeof window !== "undefined") {
          localStorage.removeItem("signal_session_start");
        }
      }

      setLoading(false);

      // 開発環境で認証情報をコンソールに表示
      if (process.env.NODE_ENV === "development") {
        console.group("🔐 Firebase Authentication Info");
        if (user) {
          console.log("✅ User Authenticated:", {
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
              lastSignInTime: user.metadata.lastSignInTime,
            },
          });
          console.log("📱 Access Token:", "Not directly accessible from User object");
          console.log("🔄 Refresh Token:", "Not directly accessible from User object");
        } else {
          console.log("❌ No user authenticated");
        }
        console.groupEnd();
      }
    });

    return () => unsubscribe();
  }, [router]);

  // 6時間で自動ログアウト機能
  useEffect(() => {
    if (!user || typeof window === "undefined") {return;}

    const checkSessionTimeout = () => {
      const sessionStart = localStorage.getItem("signal_session_start");

      if (sessionStart) {
        const sessionStartTime = parseInt(sessionStart, 10);
        const currentTime = Date.now();
        const elapsedTime = currentTime - sessionStartTime;
        const sixHoursInMs = 6 * 60 * 60 * 1000; // 6時間

        if (elapsedTime >= sixHoursInMs) {
          // 6時間経過したら自動ログアウト
          firebaseSignOut(auth);
          localStorage.removeItem("signal_session_start");

          // ログイン画面に自動リダイレクト
          if (typeof window !== "undefined") {
            router.push("/login");
          }
        }
      }
    };

    // 初回チェック
    checkSessionTimeout();

    // 5分ごとにチェック
    const intervalId = setInterval(checkSessionTimeout, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, router]);

  const signIn = async (email: string, password: string) => {
    try {
      // ネットワーク接続を確認
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("NETWORK_OFFLINE");
      }

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
          throw new Error("CONTRACT_EXPIRED");
        }

        // ログイン成功時、セッション開始時刻を記録
        if (typeof window !== "undefined") {
          localStorage.setItem("signal_session_start", Date.now().toString());
        }
      }
    } catch (error: unknown) {
      // エラーの詳細をログに記録
      if (process.env.NODE_ENV === "development") {
        console.error("Sign in error:", error);
        
        // Firebaseエラーの詳細を確認
        if (error && typeof error === "object" && "code" in error) {
          const firebaseError = error as { code: string; message: string };
          console.error("Firebase error code:", firebaseError.code);
          console.error("Firebase error message:", firebaseError.message);
          
          // ネットワークエラーの場合、追加情報を表示
          if (firebaseError.code === "auth/network-request-failed") {
            console.error("ネットワークエラーの可能性:");
            console.error("- インターネット接続を確認してください");
            console.error("- ファイアウォールやプロキシの設定を確認してください");
            console.error("- Firebase設定（APIキー、プロジェクトID）を確認してください");
            console.error("- Firebaseサービスのステータスを確認してください: https://status.firebase.google.com/");
          }
        }
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);

      // セッション情報をクリア
      if (typeof window !== "undefined") {
        localStorage.removeItem("signal_session_start");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Sign out error:", error);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
