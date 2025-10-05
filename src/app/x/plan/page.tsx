'use client';

import React from 'react';
import SNSLayout from '../../../components/sns-layout';
import PlanForm from './components/PlanForm';
import CurrentGoalPanel from './components/CurrentGoalPanel';
import SimulationPanel from './components/SimulationPanel';
import AIDiagnosisPanel from './components/AIDiagnosisPanel';
import ABTestPanel from './components/ABTestPanel';
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
            <CurrentGoalPanel planData={planData} />
            
            <SimulationPanel planData={planData} />
            
            <AIDiagnosisPanel planData={planData} />
            
            <ABTestPanel planData={planData} />
          </div>
        </main>
      </div>
    </SNSLayout>
  );
}
