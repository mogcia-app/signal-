"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Copy, Tag } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";

interface ToolPanelProps {
  onTemplateSelect: (template: string) => void;
  onHashtagSelect: (hashtag: string) => void;
}

const DEFAULT_TEMPLATES = [
  "おはようございます！今日も素敵な一日をお過ごしください✨",
  "ありがとうございます🙏",
  "フォローありがとうございます！",
  "いいねありがとうございます💕",
  "コメントありがとうございます！",
  "今日の一枚📸",
  "お疲れ様でした！",
  "素敵な週末をお過ごしください🌅",
];

export const ToolPanel: React.FC<ToolPanelProps> = ({
  onTemplateSelect,
  onHashtagSelect,
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // APIから読み込み
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await authFetch("/api/user/lab-settings");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTemplates(data.data.templates || DEFAULT_TEMPLATES);
            setHashtags(data.data.hashtags || []);
          }
        } else {
          // エラー時はデフォルト値を設定
          setTemplates(DEFAULT_TEMPLATES);
          setHashtags([]);
        }
      } catch (error) {
        console.error("ラボ設定読み込みエラー:", error);
        // エラー時はデフォルト値を設定
        setTemplates(DEFAULT_TEMPLATES);
        setHashtags([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.uid]);

  const [newTemplate, setNewTemplate] = useState("");
  const [newHashtag, setNewHashtag] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  const [editingHashtag, setEditingHashtag] = useState<number | null>(null);

  // APIに保存
  const saveSettings = async (newTemplates: string[], newHashtags: string[]) => {
    if (!user?.uid) {
      console.warn("ユーザーがログインしていないため、保存できません");
      return;
    }

    try {
      const response = await authFetch("/api/user/lab-settings", {
        method: "POST",
        body: JSON.stringify({
          templates: newTemplates,
          hashtags: newHashtags,
        }),
      });

      if (!response.ok) {
        console.error("ラボ設定保存エラー:", await response.text());
      }
      } catch (error) {
      console.error("ラボ設定保存エラー:", error);
    }
  };

  const handleAddTemplate = () => {
    if (newTemplate.trim()) {
      const updated = [...templates, newTemplate.trim()];
      setTemplates(updated);
      saveSettings(updated, hashtags);
      setNewTemplate("");
    }
  };

  const handleEditTemplate = (index: number, newValue: string) => {
    const updated = templates.map((template, i) => (i === index ? newValue : template));
    setTemplates(updated);
    saveSettings(updated, hashtags);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (index: number) => {
    const updated = templates.filter((_, i) => i !== index);
    setTemplates(updated);
    saveSettings(updated, hashtags);
  };

  const handleAddHashtag = () => {
    if (newHashtag.trim()) {
      const hashtag = newHashtag.trim().replace("#", "");
      const updated = [...hashtags, hashtag];
      setHashtags(updated);
      saveSettings(templates, updated);
      setNewHashtag("");
    }
  };

  const handleEditHashtag = (index: number, newValue: string) => {
    const updated = hashtags.map((hashtag, i) => (i === index ? newValue : hashtag));
    setHashtags(updated);
    saveSettings(templates, updated);
    setEditingHashtag(null);
  };

  const handleDeleteHashtag = (index: number) => {
    const updated = hashtags.filter((_, i) => i !== index);
    setHashtags(updated);
    saveSettings(templates, updated);
  };

  // コピー機能は将来実装予定
  // const handleCopyTemplate = (template: string) => {
  //   navigator.clipboard.writeText(template);
  // };

  // const handleCopyHashtag = (hashtag: string) => {
  //   navigator.clipboard.writeText(`#${hashtag}`);
  // };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff8a15] mx-auto mb-2"></div>
          <p className="text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* よく使う文言 */}
      <div className="bg-white shadow-sm border border-gray-200 h-[380px] sm:h-[420px] flex flex-col">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black flex items-center">
              <Edit size={18} className="mr-2" />
              よく使う文言
            </h3>
            <span className="text-sm text-black">{templates.length}件</span>
          </div>

          {/* 新規追加 */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder="新しい文言を追加..."
                className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15]"
                onKeyPress={(e) => e.key === "Enter" && handleAddTemplate()}
              />
              <button
                onClick={handleAddTemplate}
                className="px-4 py-2 bg-[#ff8a15] text-white hover:bg-orange-600 flex items-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* 文言一覧 */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
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
                      if (e.key === "Enter") {
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
                    className="p-1 text-black hover:text-gray-800"
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
      <div className="bg-white shadow-sm border border-gray-200 h-[380px] sm:h-[420px] flex flex-col">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black flex items-center">
              <Tag size={18} className="mr-2" />
              ハッシュタグ
            </h3>
            <span className="text-sm text-black">{hashtags.length}件</span>
          </div>

          {/* 新規追加 */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                placeholder="新しいハッシュタグを追加..."
                className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15]"
                onKeyPress={(e) => e.key === "Enter" && handleAddHashtag()}
              />
              <button
                onClick={handleAddHashtag}
                className="px-4 py-2 bg-[#ff8a15] text-white hover:bg-orange-600 flex items-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* ハッシュタグ一覧 */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {hashtags.length > 0 ? (
              hashtags.map((hashtag, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 group"
                >
                  {editingHashtag === index ? (
                    <input
                      type="text"
                      defaultValue={hashtag}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                      onBlur={(e) => handleEditHashtag(index, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
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
                      className="p-1 text-black hover:text-gray-800"
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
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🏷️</div>
                <p className="text-sm">ハッシュタグを追加しよう！</p>
                <p className="text-xs mt-1">上の入力欄から追加できます</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolPanel;
