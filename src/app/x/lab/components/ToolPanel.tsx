'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface ToolPanelProps {
  onTemplateSelect: (template: string) => void;
  onHashtagSelect: (hashtag: string) => void;
}

interface EditableItem {
  id: string;
  text: string;
  isEditing: boolean;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ onTemplateSelect, onHashtagSelect }) => {
  const [templates, setTemplates] = useState<EditableItem[]>([
    { id: '1', text: "今日の気づき: ", isEditing: false },
    { id: '2', text: "質問です: ", isEditing: false },
    { id: '3', text: "みなさんはどう思いますか？", isEditing: false },
    { id: '4', text: "おすすめ: ", isEditing: false },
    { id: '5', text: "今話題の: ", isEditing: false },
    { id: '6', text: "感謝: ", isEditing: false },
    { id: '7', text: "驚いた！", isEditing: false },
    { id: '8', text: "楽しかった！", isEditing: false }
  ]);

  const [hashtags, setHashtags] = useState<EditableItem[]>([
    { id: '1', text: "#X", isEditing: false },
    { id: '2', text: "#ツイート", isEditing: false },
    { id: '3', text: "#エンゲージメント", isEditing: false },
    { id: '4', text: "#フォロワー", isEditing: false },
    { id: '5', text: "#成長", isEditing: false },
    { id: '6', text: "#コミュニティ", isEditing: false },
    { id: '7', text: "#情報発信", isEditing: false },
    { id: '8', text: "#リアルタイム", isEditing: false }
  ]);

  const [newTemplate, setNewTemplate] = useState('');
  const [newHashtag, setNewHashtag] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editingHashtag, setEditingHashtag] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // ローカルストレージからデータを読み込み
  useEffect(() => {
    const savedTemplates = localStorage.getItem('x-lab-templates');
    const savedHashtags = localStorage.getItem('x-lab-hashtags');
    
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
    if (savedHashtags) {
      setHashtags(JSON.parse(savedHashtags));
    }
  }, []);

  // ローカルストレージに保存
  const saveToStorage = (templates: EditableItem[], hashtags: EditableItem[]) => {
    localStorage.setItem('x-lab-templates', JSON.stringify(templates));
    localStorage.setItem('x-lab-hashtags', JSON.stringify(hashtags));
  };

  // テンプレートの追加
  const addTemplate = () => {
    if (newTemplate.trim()) {
      const newItem: EditableItem = {
        id: Date.now().toString(),
        text: newTemplate.trim(),
        isEditing: false
      };
      const updatedTemplates = [...templates, newItem];
      setTemplates(updatedTemplates);
      setNewTemplate('');
      saveToStorage(updatedTemplates, hashtags);
    }
  };

  // ハッシュタグの追加
  const addHashtag = () => {
    if (newHashtag.trim()) {
      const hashtagText = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
      const newItem: EditableItem = {
        id: Date.now().toString(),
        text: hashtagText,
        isEditing: false
      };
      const updatedHashtags = [...hashtags, newItem];
      setHashtags(updatedHashtags);
      setNewHashtag('');
      saveToStorage(templates, updatedHashtags);
    }
  };

  // テンプレートの編集開始
  const startEditTemplate = (id: string, currentText: string) => {
    setEditingTemplate(id);
    setEditText(currentText);
  };

  // ハッシュタグの編集開始
  const startEditHashtag = (id: string, currentText: string) => {
    setEditingHashtag(id);
    setEditText(currentText);
  };

  // 編集の保存
  const saveEdit = (type: 'template' | 'hashtag') => {
    if (editText.trim()) {
      if (type === 'template') {
        const updatedTemplates = templates.map(item =>
          item.id === editingTemplate ? { ...item, text: editText.trim(), isEditing: false } : item
        );
        setTemplates(updatedTemplates);
        saveToStorage(updatedTemplates, hashtags);
      } else {
        const hashtagText = editText.trim().startsWith('#') ? editText.trim() : `#${editText.trim()}`;
        const updatedHashtags = hashtags.map(item =>
          item.id === editingHashtag ? { ...item, text: hashtagText, isEditing: false } : item
        );
        setHashtags(updatedHashtags);
        saveToStorage(templates, updatedHashtags);
      }
      setEditingTemplate(null);
      setEditingHashtag(null);
      setEditText('');
    }
  };

  // 編集のキャンセル
  const cancelEdit = () => {
    setEditingTemplate(null);
    setEditingHashtag(null);
    setEditText('');
  };

  // テンプレートの削除
  const deleteTemplate = (id: string) => {
    const updatedTemplates = templates.filter(item => item.id !== id);
    setTemplates(updatedTemplates);
    saveToStorage(updatedTemplates, hashtags);
  };

  // ハッシュタグの削除
  const deleteHashtag = (id: string) => {
    const updatedHashtags = hashtags.filter(item => item.id !== id);
    setHashtags(updatedHashtags);
    saveToStorage(templates, updatedHashtags);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-black">ツールパネル</h3>
        <p className="text-sm text-black mt-1">テンプレートとハッシュタグをカスタマイズできます</p>
      </div>
      <div className="p-6 space-y-6">
        {/* テンプレート */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">テンプレート</h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder="新しいテンプレートを追加..."
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addTemplate()}
              />
              <button
                onClick={addTemplate}
                disabled={!newTemplate.trim()}
                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <div key={template.id} className="group relative">
                {editingTemplate === template.id ? (
                  <div className="flex items-center space-x-1 p-2 bg-blue-50 rounded-lg">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit('template')}
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit('template')}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Save size={10} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-lg">
                    <button
                      onClick={() => onTemplateSelect(template.text)}
                      className="flex-1 text-xs text-left"
                    >
                      {template.text}
                    </button>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditTemplate(template.id, template.text)}
                        className="p-1 text-black hover:text-blue-600 rounded"
                      >
                        <Edit2 size={10} />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1 text-black hover:text-red-600 rounded"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ハッシュタグ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">ハッシュタグ</h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                placeholder="新しいハッシュタグを追加..."
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
              />
              <button
                onClick={addHashtag}
                disabled={!newHashtag.trim()}
                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((hashtag) => (
              <div key={hashtag.id} className="group relative">
                {editingHashtag === hashtag.id ? (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-full">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit('hashtag')}
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit('hashtag')}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Save size={10} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors">
                    <button
                      onClick={() => onHashtagSelect(hashtag.text)}
                      className="text-xs"
                    >
                      {hashtag.text}
                    </button>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditHashtag(hashtag.id, hashtag.text)}
                        className="p-0.5 text-blue-600 hover:text-blue-800 rounded"
                      >
                        <Edit2 size={8} />
                      </button>
                      <button
                        onClick={() => deleteHashtag(hashtag.id)}
                        className="p-0.5 text-blue-600 hover:text-red-600 rounded"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
