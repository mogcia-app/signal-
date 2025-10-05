'use client';

import React from 'react';

interface ToolPanelProps {
  onTemplateSelect: (template: string) => void;
  onHashtagSelect: (hashtag: string) => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ onTemplateSelect, onHashtagSelect }) => {
  const templates = [
    "今日の気づき: ",
    "質問です: ",
    "みなさんはどう思いますか？",
    "おすすめ: ",
    "今話題の: ",
    "感謝: ",
    "驚いた！",
    "楽しかった！"
  ];

  const popularHashtags = [
    "#X",
    "#ツイート",
    "#エンゲージメント",
    "#フォロワー",
    "#成長",
    "#コミュニティ",
    "#情報発信",
    "#リアルタイム"
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">ツールパネル</h3>
      </div>
      <div className="p-6 space-y-6">
        {/* テンプレート */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">テンプレート</h4>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template, index) => (
              <button
                key={index}
                onClick={() => onTemplateSelect(template)}
                className="p-2 text-xs text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        {/* 人気ハッシュタグ */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">人気ハッシュタグ</h4>
          <div className="flex flex-wrap gap-2">
            {popularHashtags.map((hashtag, index) => (
              <button
                key={index}
                onClick={() => onHashtagSelect(hashtag)}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-full transition-colors"
              >
                {hashtag}
              </button>
            ))}
          </div>
        </div>

        {/* クイックアクション */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">クイックアクション</h4>
          <div className="space-y-2">
            <button
              onClick={() => onTemplateSelect("今日の気づき: ")}
              className="w-full text-left p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="text-sm font-medium text-green-900">💡 気づきを共有</div>
            </button>
            <button
              onClick={() => onTemplateSelect("質問です: ")}
              className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="text-sm font-medium text-blue-900">❓ 質問を投げかける</div>
            </button>
            <button
              onClick={() => onTemplateSelect("おすすめ: ")}
              className="w-full text-left p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <div className="text-sm font-medium text-purple-900">⭐ おすすめを紹介</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolPanel;
