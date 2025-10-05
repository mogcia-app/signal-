'use client';

import React, { useState } from 'react';
import SNSLayout from '../../../components/sns-layout';
import PlanForm from './components/PlanForm';
import CurrentGoalPanel from './components/CurrentGoalPanel';
import SimulationPanel from './components/SimulationPanel';
import AIDiagnosisPanel from './components/AIDiagnosisPanel';
import ABTestPanel from './components/ABTestPanel';
import { usePlanData } from '../../../hooks/usePlanData';

export default function XPlanPage() {
  const { planData, loading, error } = usePlanData();
  const [activeTab, setActiveTab] = useState<'plan' | 'simulation' | 'diagnosis' | 'abtest'>('plan');

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
        {/* タブナビゲーション */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('plan')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'plan'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 運用計画
              </button>
              <button
                onClick={() => setActiveTab('simulation')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'simulation'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 シミュレーション
              </button>
              <button
                onClick={() => setActiveTab('diagnosis')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'diagnosis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔍 AI診断
              </button>
              <button
                onClick={() => setActiveTab('abtest')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'abtest'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🧪 A/Bテスト
              </button>
            </nav>
          </div>
        </div>

        {/* タブコンテンツ */}
        <div className="space-y-6">
          {activeTab === 'plan' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PlanForm />
              </div>
              <div>
                <CurrentGoalPanel planData={planData} />
              </div>
            </div>
          )}

          {activeTab === 'simulation' && (
            <SimulationPanel planData={planData} />
          )}

          {activeTab === 'diagnosis' && (
            <AIDiagnosisPanel planData={planData} />
          )}

          {activeTab === 'abtest' && (
            <ABTestPanel planData={planData} />
          )}
        </div>
      </div>
    </SNSLayout>
  );
}
