'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { useRouter } from 'next/navigation';
import { User, Mail, Building2, Calendar, Shield, Edit2, Save, X } from 'lucide-react';
import { UserProfile } from '../../types/user';
import { auth } from '../../lib/firebase';

export default function MyAccountPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState('');

  // ユーザー認証チェック
  useEffect(() => {
    // loading中はリダイレクトしない（Firebase初期化待ち）
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // プロファイル取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        const token = await auth.currentUser?.getIdToken();
        
        const response = await fetch(`/api/user/profile?userId=${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (result.success) {
          setProfile(result.data);
          setEditedName(result.data.name);
        } else {
          setError(result.error || 'プロファイルの取得に失敗しました');
        }
      } catch (err) {
        console.error('プロファイル取得エラー:', err);
        setError('プロファイルの取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.uid]);

  // プロファイル更新
  const handleSaveProfile = async () => {
    if (!user?.uid || !profile) return;

    try {
      setIsSaving(true);
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          updates: {
            name: editedName
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setProfile(result.data);
        setIsEditing(false);
      } else {
        alert(result.error || 'プロファイルの更新に失敗しました');
      }
    } catch (err) {
      console.error('プロファイル更新エラー:', err);
      alert('プロファイルの更新中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-black">プロファイルを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-50 rounded-lg mb-4">
            <p className="text-red-600">{error || 'プロファイルが見つかりません'}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">マイアカウント</h1>
                <p className="text-sm text-black">プロファイル情報と契約内容</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-black hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 基本情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* プロファイル情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-black">プロファイル情報</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>編集</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isSaving ? '保存中...' : '保存'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedName(profile.name);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-black hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>キャンセル</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* 名前 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-2" />
                    表示名
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-black">{profile.name}</p>
                  )}
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-2" />
                    メールアドレス
                  </label>
                  <p className="text-black">{profile.email}</p>
                  <p className="text-xs text-black mt-1">※メールアドレスは変更できません</p>
                </div>

                {/* ユーザーID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="h-4 w-4 inline mr-2" />
                    ユーザーID
                  </label>
                  <p className="text-black text-sm font-mono bg-gray-50 p-2 rounded">{profile.id}</p>
                </div>
              </div>
            </div>

            {/* ビジネス情報 */}
            {profile.businessInfo && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-black mb-6">ビジネス情報</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Building2 className="h-4 w-4 inline mr-2" />
                        業種
                      </label>
                      <p className="text-black">{profile.businessInfo.industry || '未設定'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">会社規模</label>
                      <p className="text-black">{profile.businessInfo.companySize || '未設定'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">事業形態</label>
                      <p className="text-black">{profile.businessInfo.businessType || '未設定'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ターゲット市場</label>
                      <p className="text-black">{profile.businessInfo.targetMarket || '未設定'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">事業内容</label>
                    <p className="text-black">{profile.businessInfo.description || '未設定'}</p>
                  </div>

                  {profile.businessInfo.goals && profile.businessInfo.goals.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">目標</label>
                      <div className="flex flex-wrap gap-2">
                        {profile.businessInfo.goals.map((goal, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                          >
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.businessInfo.challenges && profile.businessInfo.challenges.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">課題</label>
                      <div className="flex flex-wrap gap-2">
                        {profile.businessInfo.challenges.map((challenge, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm"
                          >
                            {challenge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 契約情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-black mb-4">契約情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契約タイプ</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    profile.contractType === 'annual' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {profile.contractType === 'annual' ? '年間契約' : 'トライアル'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">利用形態</label>
                  <p className="text-black">{profile.usageType === 'team' ? 'チーム' : 'ソロ'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SNS契約数</label>
                  <p className="text-black">{profile.snsCount} 件</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契約SNS</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.contractSNS.map((sns) => (
                      <span
                        key={sns}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                      >
                        {sns}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    契約期間
                  </label>
                  <p className="text-black text-sm">
                    {new Date(profile.contractStartDate).toLocaleDateString('ja-JP')} 〜 {new Date(profile.contractEndDate).toLocaleDateString('ja-JP')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    profile.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : profile.status === 'inactive'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {profile.status === 'active' ? 'アクティブ' : profile.status === 'inactive' ? '非アクティブ' : '停止中'}
                  </span>
                </div>
              </div>
            </div>

            {/* アカウント情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-black mb-4">アカウント情報</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-black">作成日</span>
                  <span className="text-black">{new Date(profile.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">最終更新</span>
                  <span className="text-black">{new Date(profile.updatedAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}