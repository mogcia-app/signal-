'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  score: number;
  label: string;
}

interface RechartsAreaChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
}

const RechartsAreaChart: React.FC<RechartsAreaChartProps> = ({ 
  data, 
  title, 
  subtitle 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
            <span className="text-2xl">📈</span>
          </div>
          <h3 className="text-lg font-semibold text-black mb-2">データを蓄積中...</h3>
          <p className="text-black mb-4">
            分析データを入力すると、<br />
            美しいスコア推移グラフが表示されます
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-lg shadow-sm">
            <span className="mr-2">🚀</span>
            最初の投稿を分析してみよう！
          </div>
        </div>
      </div>
    );
  }

  // データの統計計算
  const maxScore = Math.max(...data.map(d => d.score));
  const minScore = Math.min(...data.map(d => d.score));
  const avgScore = Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-600">
          <div className="font-medium text-orange-300">{label}</div>
          <div className="text-orange-100">スコア: {payload[0].value}点</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">{title}</h3>
        {subtitle && <p className="text-sm text-black mt-1">{subtitle}</p>}
      </div>

      {/* Recharts AreaChart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3}/>
                <stop offset="50%" stopColor="#ea580c" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#c2410c" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="label" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={[0, 100]}
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#fb923c"
              strokeWidth={3}
              fill="url(#colorScore)"
              dot={{
                fill: '#fb923c',
                stroke: '#fff',
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: '#fb923c',
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 凡例と統計 */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
            <span className="text-sm text-black">アカウントスコア推移</span>
          </div>
        </div>
        
        <div className="text-xs text-black space-x-4">
          <span>最高: <span className="font-medium text-orange-600">{maxScore}点</span></span>
          <span>最低: <span className="font-medium text-orange-600">{minScore}点</span></span>
          <span>平均: <span className="font-medium text-orange-600">{avgScore}点</span></span>
        </div>
      </div>
    </div>
  );
};

export default RechartsAreaChart;
