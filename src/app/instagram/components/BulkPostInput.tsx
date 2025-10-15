'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';

interface PostData {
  title: string;
  content: string;
  hashtags: string;
  category: 'feed' | 'reel' | 'story';
  publishedAt: string;
  publishedTime: string;
  likes: string;
  comments: string;
  shares: string;
  reach: string;
}

interface BulkPostInputProps {
  onImport: (posts: PostData[]) => void;
  isLoading: boolean;
}

const BulkPostInput: React.FC<BulkPostInputProps> = ({ onImport, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [importMode, setImportMode] = useState<'csv' | 'manual'>('csv');
  const [csvData, setCsvData] = useState<string>('');
  const [manualPosts, setManualPosts] = useState<PostData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSVテンプレートをダウンロード
  const downloadTemplate = () => {
    const template = `タイトル,内容,ハッシュタグ,カテゴリ,投稿日,投稿時間,いいね数,コメント数,シェア数,リーチ数
例: 朝の風景,美しい朝日が見えました,#朝日 #風景 #インスタ映え,feed,2024-01-15,09:00,150,25,10,500
例: 美味しい料理,今日のランチです,#料理 #ランチ #美味しい,feed,2024-01-15,12:30,200,30,15,800`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'instagram_posts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSVファイルを読み込み
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
    };
    reader.readAsText(file);
  };

  // CSVデータを解析
  const parseCsvData = (): PostData[] => {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const posts: PostData[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push(`行 ${i + 1}: 列数が一致しません`);
        continue;
      }

      const post: PostData = {
        title: values[0] || '',
        content: values[1] || '',
        hashtags: values[2] || '',
        category: (values[3] as 'feed' | 'reel' | 'story') || 'feed',
        publishedAt: values[4] || '',
        publishedTime: values[5] || '',
        likes: values[6] || '0',
        comments: values[7] || '0',
        shares: values[8] || '0',
        reach: values[9] || '0'
      };

      // 必須項目のチェック
      if (!post.title || !post.content) {
        errors.push(`行 ${i + 1}: タイトルと内容は必須です`);
        continue;
      }

      posts.push(post);
    }

    setErrors(errors);
    return posts;
  };

  // 手動入力で投稿を追加
  const addManualPost = () => {
    const newPost: PostData = {
      title: '',
      content: '',
      hashtags: '',
      category: 'feed',
      publishedAt: new Date().toISOString().split('T')[0],
      publishedTime: new Date().toTimeString().slice(0, 5),
      likes: '0',
      comments: '0',
      shares: '0',
      reach: '0'
    };
    setManualPosts([...manualPosts, newPost]);
  };

  // 手動入力の投稿を削除
  const removeManualPost = (index: number) => {
    setManualPosts(manualPosts.filter((_, i) => i !== index));
  };

  // 手動入力の投稿を更新
  const updateManualPost = (index: number, field: keyof PostData, value: string) => {
    const updated = [...manualPosts];
    updated[index] = { ...updated[index], [field]: value };
    setManualPosts(updated);
  };

  // インポート実行
  const handleImport = () => {
    const posts = importMode === 'csv' ? parseCsvData() : manualPosts.filter(post => post.title && post.content);
    
    if (posts.length > 0 && errors.length === 0) {
      onImport(posts);
      setIsExpanded(false);
      setCsvData('');
      setManualPosts([]);
      setErrors([]);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">既存投稿を一括入力</h3>
              <p className="text-xs text-gray-500">CSVインポートまたは手動で複数投稿を追加</p>
            </div>
          </div>
          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <X className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* インポート方法の選択 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setImportMode('csv')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                importMode === 'csv' 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              CSVインポート
            </button>
            <button
              onClick={() => setImportMode('manual')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                importMode === 'manual' 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              手動入力
            </button>
          </div>

          {importMode === 'csv' ? (
            <div className="space-y-4">
              {/* CSVインポート */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>テンプレートダウンロード</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>CSVファイルを選択</span>
                </button>
              </div>

              {csvData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSVデータプレビュー
                  </label>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    rows={6}
                    placeholder="CSVデータを貼り付けるか、ファイルを選択してください"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 手動入力 */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">投稿一覧</h4>
                <button
                  onClick={addManualPost}
                  className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors text-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>追加</span>
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {manualPosts.map((post, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">投稿 {index + 1}</span>
                      <button
                        onClick={() => removeManualPost(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={post.title}
                        onChange={(e) => updateManualPost(index, 'title', e.target.value)}
                        placeholder="タイトル"
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <select
                        value={post.category}
                        onChange={(e) => updateManualPost(index, 'category', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="feed">フィード</option>
                        <option value="reel">リール</option>
                        <option value="story">ストーリー</option>
                      </select>
                    </div>
                    <textarea
                      value={post.content}
                      onChange={(e) => updateManualPost(index, 'content', e.target.value)}
                      placeholder="投稿内容"
                      rows={2}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={post.likes}
                        onChange={(e) => updateManualPost(index, 'likes', e.target.value)}
                        placeholder="いいね数"
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        value={post.comments}
                        onChange={(e) => updateManualPost(index, 'comments', e.target.value)}
                        placeholder="コメント数"
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        value={post.shares}
                        onChange={(e) => updateManualPost(index, 'shares', e.target.value)}
                        placeholder="シェア数"
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">入力エラー</span>
              </div>
              <ul className="text-xs text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* インポートボタン */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleImport}
              disabled={isLoading || (importMode === 'csv' ? !csvData : manualPosts.length === 0)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>インポート中...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>インポート実行</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkPostInput;
