"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { authFetch } from "../utils/authFetch";
import { installAuthFetch } from "../utils/installAuthFetch";

const AUTH_CALLBACK_IN_PROGRESS_KEY = "signal_auth_callback_in_progress_at";
const DEBUG_AUTH_KEY = "signal_debug_auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  contractValid: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isExpectedOfflineFirestoreError = (error: unknown): boolean => {
  const maybeFirebaseError = error as { code?: string; message?: string };
  const code = maybeFirebaseError?.code || "";
  const message = (maybeFirebaseError?.message || "").toLowerCase();

  return (
    code === "unavailable" ||
    code === "permission-denied" ||
    code === "failed-precondition" ||
    message.includes("could not reach cloud firestore backend") ||
    message.includes("client is offline") ||
    message.includes("backend didn't respond within 10 seconds")
  );
};

const shouldDebugAuthLogs = (): boolean => {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(DEBUG_AUTH_KEY) === "1";
  } catch {
    return false;
  }
};

const authDebug = (...args: unknown[]) => {
  if (shouldDebugAuthLogs()) {
    console.debug(...args);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractValid, setContractValid] = useState(false);

  useEffect(() => {
    installAuthFetch();
  }, []);

  const requestWith401Retry = useCallback(
    async (
      input: RequestInfo | URL,
      options: RequestInit,
      max401Retries = 2,
      initialDelayMs = 120,
    ): Promise<Response> => {
      let response = await authFetch(input, options);

      for (let attempt = 0; response.status === 401 && attempt < max401Retries; attempt += 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        response = await authFetch(input, options);
      }

      return response;
    },
    [],
  );

  // ユーザードキュメントを作成または更新する関数（APIルート経由）
  const ensureUserDocument = useCallback(async (user: User): Promise<void> => {
    try {
      // APIルート経由でユーザードキュメントを確認・作成
      const response = await requestWith401Retry("/api/user/ensure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to ensure user document: ${response.status}`;
        
        // Unauthorizedは認証直後タイミングの可能性があるため、ここでは致命扱いしない
        if (response.status === 401) {
          authDebug("[auth-context] /api/user/ensure returned 401 after immediate retries");
          return;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success) {
        if (result.created) {
          authDebug("✅ User document created via API:", user.uid);
        } else {
          authDebug("✅ User document already exists:", user.uid);
        }
      }
    } catch (error) {
      console.error("🔐 Error ensuring user document:", error);
      // エラーが発生してもアプリケーションの動作を継続
      // （ユーザードキュメントが存在しない場合でも、後で作成される可能性がある）
    }
  }, [requestWith401Retry]);

  const checkContractStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await requestWith401Retry(
        "/api/user/contract-status",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        2,
        150,
      );

      if (response.status === 401) {
        authDebug("[auth-context] /api/user/contract-status returned 401 after retries");
        return true;
      }

      if (!response.ok) {
        throw new Error(`Contract status request failed: ${response.status}`);
      }

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; isValid?: boolean }
        | null;

      if (!result?.success || typeof result.isValid !== "boolean") {
        throw new Error("Invalid contract status response");
      }

      return result.isValid;
    } catch (error) {
      console.error("[auth-context] Contract status check failed:", error);
      return true;
    }
  }, [requestWith401Retry]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // ユーザーがログインしている場合、Firestoreドキュメントを確認・作成
      if (user) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(AUTH_CALLBACK_IN_PROGRESS_KEY);
        }

        // セッション開始時刻を記録
        if (typeof window !== "undefined") {
          const existingSession = localStorage.getItem("signal_session_start");
          if (!existingSession) {
            localStorage.setItem("signal_session_start", Date.now().toString());
          }
        }

        try {
          await ensureUserDocument(user);

          // SentryにサポートIDを設定（非同期、エラーが発生しても処理は続行）
          if (typeof window !== "undefined") {
            import("@sentry/nextjs")
              .then((Sentry) => {
                // ユーザープロファイルからサポートIDを取得
                import("../lib/firebase")
                  .then(({ db }) => {
                    import("firebase/firestore")
                      .then(({ doc, getDoc }) => {
                        getDoc(doc(db, "users", user.uid))
                          .then((userDoc) => {
                            if (userDoc.exists()) {
                              const userData = userDoc.data();
                              const supportId = userData?.supportId;
                              const planTier = userData?.planTier;
                              const accountType = userData?.usageType;
                              
                              if (supportId) {
                                Sentry.setUser({
                                  id: supportId, // サポートIDをSentryのuser.idに設定
                                  email: user.email ?? undefined,
                                  username: user.displayName ?? undefined,
                                });
                                
                                // タグを設定
                                Sentry.setTag("plan", planTier || "unknown");
                                Sentry.setTag("account_type", accountType || "unknown");
                                Sentry.setTag("user_id", user.uid);

                                authDebug("✅ SentryにサポートIDを設定:", supportId);
                              }
                            }
                          })
                          .catch((error) => {
                            if (isExpectedOfflineFirestoreError(error)) {
                              authDebug("[auth-context] FirestoreオフラインのためSentryユーザー設定をスキップ");
                              return;
                            }
                            console.error("[auth-context] Sentry設定エラー（Firestore取得）:", error);
                          });
                      })
                      .catch((error) => {
                        console.error("[auth-context] Sentry設定エラー（firebase/firestore読み込み）:", error);
                      });
                  })
                  .catch((error) => {
                    console.error("[auth-context] Sentry設定エラー（firebase読み込み）:", error);
                  });
              })
              .catch((error) => {
                console.error("[auth-context] Sentry設定エラー（@sentry/nextjs読み込み）:", error);
              });
          }

          // 契約期間をチェック
          const isValid = await checkContractStatus();
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
          
          // Sentryのユーザー情報をクリア
          import("@sentry/nextjs")
            .then((Sentry) => {
              Sentry.setUser(null);
            })
            .catch(() => {
              // エラーは無視
            });
        }
      }

      setLoading(false);

      // 開発環境かつ明示的に有効化した場合のみ認証情報を表示
      if (shouldDebugAuthLogs()) {
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
        }
        console.groupEnd();
      }
    });

    return () => unsubscribe();
  }, [router, ensureUserDocument, checkContractStatus]);

  // 6時間で自動ログアウト機能
  useEffect(() => {
    if (!user || typeof window === "undefined") {return;}

    const checkSessionTimeout = () => {
      const sessionStart = localStorage.getItem("signal_session_start");

      if (sessionStart) {
        const sessionStartTime = parseInt(sessionStart, 10);
        const currentTime = Date.now();
        const elapsedTime = currentTime - sessionStartTime;
        const sixHoursInMs = 3 * 60 * 60 * 1000; // 6時間

        if (elapsedTime >= sixHoursInMs) {
          // 6時間経過したら自動ログアウト
          firebaseSignOut(auth);
          localStorage.removeItem("signal_session_start");

          // ローカル環境の場合は/loginにリダイレクト、本番環境の場合はポータルページに自動リダイレクト
          if (typeof window !== "undefined") {
            const isLocal = window.location.hostname === "localhost" || 
              window.location.hostname === "127.0.0.1" ||
              process.env.NODE_ENV === "development";
            
            if (isLocal) {
              router.push("/login");
            } else {
              window.location.href = "https://signal-portal.com/";
            }
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
        const isValid = await checkContractStatus();

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
