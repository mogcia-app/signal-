"use client";

import React from "react";
import SNSLayout from "../../../components/sns-layout";
import { Brain } from "lucide-react";

export default function AILearningPage() {
  // AI学習機能は一時的に無効化
  return (
    <SNSLayout
      customTitle="AI学習進捗"
      customDescription="あなたのInstagram運用パターンを学習し、より良いAIサポートを提供します"
    >
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Brain size={64} className="mx-auto text-black" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">AI学習機能</h2>
          <p className="text-black mb-4">現在開発中です</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              AI学習機能は現在開発中です。
              <br />
              他の機能を先に完成させてから実装予定です。
            </p>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
