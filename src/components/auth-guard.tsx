"use client";

import { useAuth } from "../contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkUserContract } from "../lib/auth";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getToolMaintenanceStatus } from "@/lib/tool-maintenance";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, contractValid } = useAuth();
  const router = useRouter();
  const [isCheckingContract, setIsCheckingContract] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(false);

  // ユーザーが認証済みの場合、契約期間を定期的にチェック
  useEffect(() => {
    if (!loading && user && !isCheckingContract) {
      setIsCheckingContract(true);

      const checkContract = async () => {
        const isValid = await checkUserContract(user.uid);
        if (!isValid) {
          // 契約が無効な場合、ログアウト
          await signOut(auth);
        }
      };

      checkContract();
    }
  }, [user, loading, isCheckingContract]);

  // メンテナンス状態をチェック
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const status = await getToolMaintenanceStatus();
        setMaintenanceMode(status.enabled);

        // スケジュールされたメンテナンスのチェック
        if (status.scheduledStart && status.scheduledEnd) {
          const now = new Date();
          const start = new Date(status.scheduledStart);
          const end = new Date(status.scheduledEnd);

          if (now >= start && now <= end) {
            setMaintenanceMode(true);
          }
        }

        if (status.enabled && user) {
          // メンテナンス中はログアウトしてメンテナンス画面にリダイレクト
          await signOut(auth);
          router.push("/maintenance");
        }
      } catch (error) {
        console.error("Error checking maintenance:", error);
      } finally {
        setCheckingMaintenance(false);
      }
    };

    if (user) {
      setCheckingMaintenance(true);
      checkMaintenance();
      // 定期的にチェック（1分ごと）
      const interval = setInterval(checkMaintenance, 60000);
      return () => clearInterval(interval);
    } else {
      setCheckingMaintenance(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || checkingMaintenance) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (maintenanceMode) {
    return null; // メンテナンス画面にリダイレクト中
  }

  if (!contractValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-2xl font-bold mb-4">契約期間が終了しています</div>
          <p className="text-gray-600 mb-4">お使いのアカウントの契約期間が終了しています。</p>
          <p className="text-gray-500 text-sm">
            続けてご利用の場合は、管理者にお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
