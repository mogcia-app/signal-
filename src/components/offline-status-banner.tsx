"use client";

import { useEffect, useState } from "react";
import { WifiOff, ServerCrash } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";

type FirestoreConnectionState = "unknown" | "online" | "offline";

const isExpectedOfflineFirestoreError = (error: unknown): boolean => {
  const maybeFirebaseError = error as { code?: string; message?: string };
  const code = maybeFirebaseError?.code || "";
  const message = (maybeFirebaseError?.message || "").toLowerCase();

  return (
    code === "unavailable" ||
    code === "failed-precondition" ||
    message.includes("could not reach cloud firestore backend") ||
    message.includes("backend didn't respond within 10 seconds") ||
    message.includes("client is offline")
  );
};

export function OfflineStatusBanner() {
  const { user } = useAuth();
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);
  const [firestoreState, setFirestoreState] = useState<FirestoreConnectionState>("unknown");

  useEffect(() => {
    if (typeof window === "undefined") {return;}

    const updateOnlineState = () => setIsBrowserOnline(navigator.onLine);
    updateOnlineState();

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!isBrowserOnline) {
      setFirestoreState("offline");
      return;
    }

    // 非ログイン時はFirestore状態を判定できないため unknown 扱い
    if (!user) {
      setFirestoreState("unknown");
      return;
    }

    let hasReachedServer = false;
    const userDocRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache) {
          // 初回キャッシュ読み込み時は不明扱い。サーバー到達実績後に cache のみならオフライン寄り。
          setFirestoreState(hasReachedServer ? "offline" : "unknown");
          return;
        }

        hasReachedServer = true;
        setFirestoreState("online");
      },
      (error) => {
        if (isExpectedOfflineFirestoreError(error)) {
          setFirestoreState("offline");
          return;
        }
        setFirestoreState("unknown");
      }
    );

    return () => unsubscribe();
  }, [user, isBrowserOnline]);

  const showBanner = !isBrowserOnline || firestoreState === "offline";

  if (!showBanner) {
    return null;
  }

  const browserOffline = !isBrowserOnline;

  return (
    <>
      <div className="fixed top-1 left-0 right-0 z-[60] border-b border-amber-300 bg-amber-50 text-amber-900">
        <div className="mx-auto flex h-11 w-full max-w-screen-2xl items-center gap-2 px-4 text-sm">
          {browserOffline ? <WifiOff size={16} /> : <ServerCrash size={16} />}
          <span className="font-semibold">オフライン中</span>
          <span className="hidden sm:inline">
            {browserOffline
              ? "インターネット接続を確認してください。"
              : "インターネット接続はありますが、Firestoreに接続できません。同期が遅れる可能性があります。"}
          </span>
        </div>
      </div>
      <div className="h-11" />
    </>
  );
}

