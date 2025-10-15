'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, Copy, Tag } from 'lucide-react';

interface ToolPanelProps {
  onTemplateSelect: (template: string) => void;
  onHashtagSelect: (hashtag: string) => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  onTemplateSelect,
  onHashtagSelect
}) => {
  const [templates, setTemplates] = useState([
    'おはようございます！今日も素敵な一日をお過ごしください✨',
    'ありがとうございます🙏',
    'フォローありがとうございます！',
    'いいねありがとうございます💕',
    'コメントありがとうございます！',
    '今日の一枚📸',
    'お疲れ様でした！',
    '素敵な週末をお過ごしください🌅'
  ]);

  const [hashtags, setHashtags] = useState([
    'インスタ映え',
    'フォロー',
    'いいね',
    'コメント',
    'リポスト',
    'インスタグラム',
    'instagood',
    'photooftheday',
    'beautiful',
    'happy',
    'love',
    'cute',
    'followme',
    'like4like',
    'instadaily'
  ]);

  const [newTemplate, setNewTemplate] = useState('');
  const [newHashtag, setNewHashtag] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  const [editingHashtag, setEditingHashtag] = useState<number | null>(null);

  const handleAddTemplate = () => {
    if (newTemplate.trim()) {
      setTemplates(prev => [...prev, newTemplate.trim()]);
      setNewTemplate('');
    }
  };

  const handleEditTemplate = (index: number, newValue: string) => {
    setTemplates(prev => prev.map((template, i) => i === index ? newValue : template));
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (index: number) => {
    setTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddHashtag = () => {
    if (newHashtag.trim()) {
      const hashtag = newHashtag.trim().replace('#', '');
      setHashtags(prev => [...prev, hashtag]);
      setNewHashtag('');
    }
  };

  const handleEditHashtag = (index: number, newValue: string) => {
    setHashtags(prev => prev.map((hashtag, i) => i === index ? newValue : hashtag));
    setEditingHashtag(null);
  };

  const handleDeleteHashtag = (index: number) => {
    setHashtags(prev => prev.filter((_, i) => i !== index));
  };

  // コピー機能は将来実装予定
  // const handleCopyTemplate = (template: string) => {
  //   navigator.clipboard.writeText(template);
  // };

  // const handleCopyHashtag = (hashtag: string) => {
  //   navigator.clipboard.writeText(`#${hashtag}`);
  // };

  return (
    <div className="space-y-6">
      {/* よく使う文言 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Edit size={18} className="mr-2" />
              よく使う文言
            </h3>
            <span className="text-sm text-gray-500">{templates.length}件</span>
          </div>

          {/* 新規追加 */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder="新しい文言を追加..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15]"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTemplate()}
              />
              <button
                onClick={handleAddTemplate}
                className="px-4 py-2 bg-[#ff8a15] text-white rounded-md hover:bg-orange-600 flex items-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* 文言一覧 */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {templates.map((template, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md group"
              >
                {editingTemplate === index ? (
                  <input
                    type="text"
                    defaultValue={template}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    onBlur={(e) => handleEditTemplate(index, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEditTemplate(index, e.currentTarget.value);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-gray-800">{template}</span>
                )}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onTemplateSelect(template)}
                    className="p-1 text-orange-600 hover:text-orange-800"
                    title="投稿に追加"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => setEditingTemplate(index)}
                    className="p-1 text-gray-600 hover:text-gray-800"
                    title="編集"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ハッシュタグ管理 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Tag size={18} className="mr-2" />
              ハッシュタグ
            </h3>
            <span className="text-sm text-gray-500">{hashtags.length}件</span>
          </div>

          {/* 新規追加 */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                placeholder="新しいハッシュタグを追加..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15]"
                onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
              />
              <button
                onClick={handleAddHashtag}
                className="px-4 py-2 bg-[#ff8a15] text-white rounded-md hover:bg-orange-600 flex items-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* ハッシュタグ一覧 */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {hashtags.map((hashtag, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md group"
              >
                {editingHashtag === index ? (
                  <input
                    type="text"
                    defaultValue={hashtag}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    onBlur={(e) => handleEditHashtag(index, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEditHashtag(index, e.currentTarget.value);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-orange-600">#{hashtag}</span>
                )}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onHashtagSelect(hashtag)}
                    className="p-1 text-orange-600 hover:text-orange-800"
                    title="投稿に追加"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => setEditingHashtag(index)}
                    className="p-1 text-gray-600 hover:text-gray-800"
                    title="編集"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteHashtag(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolPanel;
