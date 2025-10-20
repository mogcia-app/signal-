import React from 'react';
import { Download } from 'lucide-react';

interface ReportHeaderProps {
  activeTab: 'weekly' | 'monthly';
  selectedWeek: string;
  selectedMonth: string;
  onTabChange: (tab: 'weekly' | 'monthly') => void;
  onWeekChange: (week: string) => void;
  onMonthChange: (month: string) => void;
  onExportPDF: () => void;
  getWeekDisplayName: (weekStr: string) => string;
  getMonthDisplayName: (monthStr: string) => string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  activeTab,
  selectedWeek,
  selectedMonth,
  onTabChange,
  onWeekChange,
  onMonthChange,
  onExportPDF,
  getWeekDisplayName,
  getMonthDisplayName
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-black">
          {activeTab === 'weekly' ? '週次' : '月次'}レポート
        </h1>
        <p className="text-black mt-1">
          {activeTab === 'weekly' ? getWeekDisplayName(selectedWeek) : getMonthDisplayName(selectedMonth)}の分析結果
        </p>
      </div>
      <div className="flex items-center space-x-3">
        {/* タブ切り替え */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onTabChange('weekly')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'weekly'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-black hover:text-black'
            }`}
          >
            週次
          </button>
          <button
            onClick={() => onTabChange('monthly')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'monthly'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-black hover:text-black'
            }`}
          >
            月次
          </button>
        </div>
        
        {/* 期間選択 */}
        {activeTab === 'weekly' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">対象週</label>
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => onWeekChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">対象月</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        
        {/* エクスポートボタン */}
        <button 
          onClick={onExportPDF}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Download size={16} className="mr-2" />
          PDF出力
        </button>
      </div>
    </div>
  );
};
