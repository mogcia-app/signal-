'use client';

import React from 'react';
import SNSLayout from '../../../components/sns-layout';
import PlanForm from './components/PlanForm';
import CurrentGoalPanel from './components/CurrentGoalPanel';
import SimulationPanel from './components/SimulationPanel';
import AIDiagnosisPanel from './components/AIDiagnosisPanel';
import { usePlanData } from '../../../hooks/usePlanData';

export default function XPlanPage() {
  const { planData, loading, error } = usePlanData();

  if (loading) {
    return (
      <SNSLayout 
        currentSNS="x"
        customTitle="X運用計画"
        customDescription="X（旧Twitter）の運用計画を立て、目標達成を目指しましょう"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SNSLayout>
    );
  }

  if (error) {
    return (
      <SNSLayout 
        currentSNS="x"
        customTitle="X運用計画"
        customDescription="X（旧Twitter）の運用計画を立て、目標達成を目指しましょう"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-red-600">エラー: {error}</div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout 
      currentSNS="x"
      customTitle="X運用計画"
      customDescription="X（旧Twitter）の運用計画を立て、目標達成を目指しましょう"
    >
      <div className="max-w-7xl mx-auto p-6">
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム：計画作成フォーム */}
          <PlanForm />

          {/* 右カラム：KPI・AIアドバイス */}
          <div className="space-y-6">
            {/* 1. 進行中の目標 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">進行中の目標</h3>
                <p className="text-sm text-gray-600">現在の目標と進捗状況</p>
              </div>
              <div className="p-6">
                <CurrentGoalPanel planData={planData} />
              </div>
            </div>
            
            {/* 2. 目標達成シミュレーション */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">目標達成シミュレーション</h3>
                <p className="text-sm text-gray-600">左側で目標を入力し、シミュレーションを実行してください</p>
              </div>
              <div className="p-6">
                <SimulationPanel planData={planData} />
              </div>
            </div>
            
            {/* 3. AIによる投稿戦略アドバイス */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">AIによる投稿戦略アドバイス</h3>
                <p className="text-sm text-gray-600">目標や施策をもとに、AIが最適な方向性を提案します</p>
              </div>
              <div className="p-6">
                <AIDiagnosisPanel planData={planData} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SNSLayout>
  );
}
