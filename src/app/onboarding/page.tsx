'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheckCircle, ArrowRight, ArrowLeft, Sparkles, User, Mail, Calendar, Edit2, Save, X } from 'lucide-react';
import SNSLayout from '../../components/sns-layout';

export default function OnboardingPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ステップ1: ビジネス情報
  const [businessInfo, setBusinessInfo] = useState({
    industry: '',
    companySize: '',
    businessType: '',
    description: '',
    targetMarket: ''
  });

  // ステップ2: 目標・課題
  const [goals, setGoals] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);

  // ステップ3: SNS AI設定
  const [snsAISettings, setSnsAISettings] = useState<Record<string, { enabled: boolean; tone?: string; features?: string[] }>>({});

  // ユーザープロファイルからデータを読み込む
  useEffect(() => {
    if (userProfile?.businessInfo) {
      setBusinessInfo({
        industry: userProfile.businessInfo.industry || '',
        companySize: userProfile.businessInfo.companySize || '',
        businessType: userProfile.businessInfo.businessType || '',
        description: userProfile.businessInfo.description || '',
        targetMarket: userProfile.businessInfo.targetMarket || ''
      });
      setGoals(userProfile.businessInfo.goals || []);
      setChallenges(userProfile.businessInfo.challenges || []);
    }
    if (userProfile?.snsAISettings) {
      setSnsAISettings(userProfile.snsAISettings as Record<string, { enabled: boolean; tone?: string; features?: string[] }>);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // 表示用の変換関数
  const getIndustryLabel = (value: string) => {
    const map: Record<string, string> = {
      'it': 'IT・テクノロジー',
      'retail': '小売・EC',
      'food': '飲食',
      'beauty': '美容・健康',
      'education': '教育',
      'realestate': '不動産',
      'other': 'その他'
    };
    return map[value] || value;
  };

  const getCompanySizeLabel = (value: string) => {
    const map: Record<string, string> = {
      'individual': '個人',
      'small': '2-10名',
      'medium': '11-50名',
      'large': '51-200名',
      'enterprise': '201名以上'
    };
    return map[value] || value;
  };

  const getBusinessTypeLabel = (value: string) => {
    const map: Record<string, string> = {
      'btoc': 'BtoC',
      'btob': 'BtoB',
      'both': 'BtoB/BtoC両方'
    };
    return map[value] || value;
  };

  const getTargetMarketLabel = (value: string) => {
    const map: Record<string, string> = {
      'teens': '10代',
      '20s': '20代',
      '30s': '30代',
      '40s': '40代',
      '50plus': '50代以上',
      'all': '全年齢'
    };
    return map[value] || value;
  };

  // 選択肢データ
  const industryOptions = ['IT・テクノロジー', '小売・EC', '飲食', '美容・健康', '教育', '不動産', 'その他'];
  const companySizeOptions = ['個人', '2-10名', '11-50名', '51-200名', '201名以上'];
  const businessTypeOptions = ['BtoC', 'BtoB', 'BtoB/BtoC両方'];
  const targetMarketOptions = ['10代', '20代', '30代', '40代', '50代以上', '全年齢'];
  
  const goalOptions = [
    'フォロワー増加',
    'エンゲージメント向上',
    'ブランド認知度向上',
    'リード獲得',
    '売上向上',
    'コミュニティ構築'
  ];
  
  const challengeOptions = [
    'コンテンツ作成',
    '投稿タイミング',
    'ハッシュタグ選定',
    '分析・改善',
    '時間不足',
    'アイデア不足'
  ];

  const toneOptions = [
    { value: 'フレンドリー', label: 'フレンドリー', emoji: '😊' },
    { value: 'プロフェッショナル', label: 'プロフェッショナル', emoji: '💼' },
    { value: 'カジュアル', label: 'カジュアル', emoji: '🎉' },
    { value: 'フォーマル', label: 'フォーマル', emoji: '🎩' }
  ];

  const featureOptions = [
    'ハッシュタグ最適化',
    '投稿時間提案',
    'コンテンツ分析',
    'トレンド分析',
    '競合分析',
    'エンゲージメント予測'
  ];

  // 次へ
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 戻る
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 完了処理
  const handleComplete = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        businessInfo: {
          ...businessInfo,
          goals,
          challenges
        },
        snsAISettings,
        setupRequired: false,
        status: 'active',
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Onboarding completed successfully');
      alert('✅ 設定を保存しました！御社専用AIに反映されました。');
      setIsEditing(false);
      setCurrentStep(1);
      // ページをリロードして最新データを反映
      window.location.reload();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('設定の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 各ステップの検証
  const isStep1Valid = businessInfo.industry && businessInfo.companySize && businessInfo.businessType && businessInfo.targetMarket;
  const isStep2Valid = goals.length > 0 && challenges.length > 0;
  const isStep3Valid = Object.keys(snsAISettings).length > 0 && Object.values(snsAISettings).some(s => s.enabled);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SNSLayout 
      currentSNS="instagram" 
      customTitle="初期設定" 
      customDescription="御社専用AIを構築するための情報を入力してください"
    >
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        {/* ユーザー情報セクション */}
        {userProfile && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">ユーザー情報</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  userProfile.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {userProfile.status === 'active' ? '✓ アクティブ' : '初期設定待ち'}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {userProfile.contractType === 'annual' ? '年間契約' : 'トライアル'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 名前 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 mr-2 text-blue-600" />
                  名前
                </label>
                <p className="text-gray-900 font-semibold text-lg">{userProfile.name}</p>
              </div>

              {/* メールアドレス */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 mr-2 text-blue-600" />
                  メールアドレス
                </label>
                <p className="text-gray-900 font-semibold text-sm break-all">{userProfile.email}</p>
              </div>

              {/* 契約期間 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  契約期間
                </label>
                <p className="text-gray-900 font-semibold text-sm">
                  {new Date(userProfile.contractStartDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  <br />
                  <span className="text-gray-500">〜</span>
                  <br />
                  {new Date(userProfile.contractEndDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </p>
              </div>
            </div>

            {/* 契約SNS */}
            {userProfile.contractSNS && userProfile.contractSNS.length > 0 && (
              <div className="mt-6 pt-6 border-t border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">契約SNS</label>
                <div className="flex flex-wrap gap-3">
                  {userProfile.contractSNS.map((sns) => (
                    <div
                      key={sns}
                      className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border-2 border-blue-200"
                    >
                      <span className="text-xl">
                        {sns === 'instagram' ? '📷' : 
                         sns === 'x' ? '🐦' : 
                         sns === 'tiktok' ? '🎵' : 
                         sns === 'youtube' ? '📺' : '📱'}
                      </span>
                      <span className="font-semibold text-gray-900 capitalize">
                        {sns === 'x' ? 'X (Twitter)' : sns}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 説明バナー */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg border-2 border-purple-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">御社専用AI構築</h2>
                  <p className="text-sm text-gray-600">初期費用 ¥150,000 のうち ¥100,000</p>
                </div>
              </div>
              {!isEditing && userProfile?.businessInfo?.industry && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="font-medium">編集</span>
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setCurrentStep(1);
                  }}
                  className="flex items-center space-x-2 px-5 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all shadow-lg"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">キャンセル</span>
                </button>
              )}
            </div>
            <div className="ml-15 pl-3 border-l-4 border-purple-300">
              <p className="text-sm text-gray-700 leading-relaxed">
                {userProfile?.businessInfo?.industry 
                  ? '✅ いただいたヒアリングをもとに組み込んでいます。内容を確認し、必要に応じて編集してください。'
                  : '📝 入力いただいた情報を元に、あなたのビジネスに最適化されたAIを構築します。'
                }
              </p>
            </div>
          </div>
        </div>

        {/* 進行状況バー（編集モード時のみ） */}
        {(isEditing || !userProfile?.businessInfo?.industry) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">ステップ {currentStep} / {totalSteps}</span>
            <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    step < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <span className="font-semibold">{step}</span>
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* メインコンテンツ */}
        {(isEditing || !userProfile?.businessInfo?.industry) ? (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ステップ1: ビジネス情報 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ビジネス情報</h2>
                <p className="text-gray-600">あなたのビジネスについて教えてください</p>
              </div>

              <div className="space-y-4">
                {/* 業種 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    業種 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {industryOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => setBusinessInfo({ ...businessInfo, industry: option })}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          businessInfo.industry === option
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 会社規模 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    会社規模 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {companySizeOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => setBusinessInfo({ ...businessInfo, companySize: option })}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          businessInfo.companySize === option
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 事業形態 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    事業形態 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {businessTypeOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => setBusinessInfo({ ...businessInfo, businessType: option })}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          businessInfo.businessType === option
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ターゲット市場 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ターゲット市場 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {targetMarketOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => setBusinessInfo({ ...businessInfo, targetMarket: option })}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          businessInfo.targetMarket === option
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 事業内容 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    事業内容（任意）
                  </label>
                  <textarea
                    value={businessInfo.description}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                    placeholder="例: オンラインでハンドメイド商品を販売しています"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ステップ2: 目標・課題 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">目標と課題</h2>
                <p className="text-gray-600">SNS運用の目標と課題を選択してください</p>
              </div>

              <div className="space-y-6">
                {/* 目標 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    目標（複数選択可） <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {goalOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          if (goals.includes(option)) {
                            setGoals(goals.filter(g => g !== option));
                          } else {
                            setGoals([...goals, option]);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          goals.includes(option)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {goals.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">{goals.length}個選択中</p>
                  )}
                </div>

                {/* 課題 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    課題（複数選択可） <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {challengeOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          if (challenges.includes(option)) {
                            setChallenges(challenges.filter(c => c !== option));
                          } else {
                            setChallenges([...challenges, option]);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          challenges.includes(option)
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {challenges.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">{challenges.length}個選択中</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ステップ3: SNS AI設定 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">SNS AI設定</h2>
                <p className="text-gray-600">各SNSのAI設定を行ってください</p>
              </div>

              <div className="space-y-6">
                {/* Instagram設定 */}
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">📷</span>
                      <h3 className="text-xl font-bold text-gray-900">Instagram</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={snsAISettings.instagram?.enabled || false}
                        onChange={(e) => {
                          setSnsAISettings({
                            ...snsAISettings,
                            instagram: {
                              enabled: e.target.checked,
                              tone: snsAISettings.instagram?.tone || 'フレンドリー',
                              features: snsAISettings.instagram?.features || []
                            }
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {snsAISettings.instagram?.enabled && (
                    <div className="space-y-4">
                      {/* トーン選択 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">トーン</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {toneOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setSnsAISettings({
                                  ...snsAISettings,
                                  instagram: {
                                    ...snsAISettings.instagram,
                                    enabled: true,
                                    tone: option.value,
                                    features: snsAISettings.instagram?.features || []
                                  }
                                });
                              }}
                              className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                snsAISettings.instagram?.tone === option.value
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <span className="text-lg">{option.emoji}</span>
                              <div className="text-xs mt-1">{option.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 機能選択 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">機能（複数選択可）</label>
                        <div className="grid grid-cols-2 gap-2">
                          {featureOptions.map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                const currentFeatures = snsAISettings.instagram?.features || [];
                                const newFeatures = currentFeatures.includes(option)
                                  ? currentFeatures.filter(f => f !== option)
                                  : [...currentFeatures, option];
                                
                                setSnsAISettings({
                                  ...snsAISettings,
                                  instagram: {
                                    ...snsAISettings.instagram,
                                    enabled: true,
                                    tone: snsAISettings.instagram?.tone || 'フレンドリー',
                                    features: newFeatures
                                  }
                                });
                              }}
                              className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                snsAISettings.instagram?.features?.includes(option)
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 他のSNSも同様に追加可能 */}
                <p className="text-sm text-gray-500 text-center">
                  ※ 他のSNS設定は後からダッシュボードで追加できます
                </p>
              </div>
            </div>
          )}

          {/* ナビゲーションボタン */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>戻る</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !isStep1Valid) ||
                  (currentStep === 2 && !isStep2Valid)
                }
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  (currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                }`}
              >
                <span>次へ</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!isStep3Valid || isSubmitting}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  !isStep3Valid || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>設定中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>完了</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        ) : (
          /* 閲覧モード */
          <div className="space-y-6">
            {/* ビジネス情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">ビジネス情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
                  <p className="text-gray-900">{getIndustryLabel(businessInfo.industry) || '未設定'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会社規模</label>
                  <p className="text-gray-900">{getCompanySizeLabel(businessInfo.companySize) || '未設定'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">事業形態</label>
                  <p className="text-gray-900">{getBusinessTypeLabel(businessInfo.businessType) || '未設定'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ターゲット市場</label>
                  <p className="text-gray-900">{getTargetMarketLabel(businessInfo.targetMarket) || '未設定'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">事業内容</label>
                  <p className="text-gray-900">{businessInfo.description || '未設定'}</p>
                </div>
              </div>
            </div>

            {/* 目標・課題 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">目標と課題</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">目標</label>
                  <div className="flex flex-wrap gap-2">
                    {goals.length > 0 ? goals.map((goal, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {goal}
                      </span>
                    )) : <span className="text-gray-500">未設定</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">課題</label>
                  <div className="flex flex-wrap gap-2">
                    {challenges.length > 0 ? challenges.map((challenge, index) => (
                      <span key={index} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
                        {challenge}
                      </span>
                    )) : <span className="text-gray-500">未設定</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* SNS AI設定 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">SNS AI設定</h3>
              <div className="space-y-4">
                {Object.keys(snsAISettings).length > 0 ? (
                  Object.entries(snsAISettings).map(([snsType, settings]) => (
                    <div key={snsType} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">
                            {snsType === 'instagram' ? '📷' : snsType === 'x' ? '🐦' : '📱'}
                          </span>
                          <span className="font-semibold text-gray-900 capitalize">{snsType}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          settings.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {settings.enabled ? '✓ 有効' : '無効'}
                        </span>
                      </div>
                      {settings.enabled && (
                        <div className="ml-7 space-y-1 text-sm">
                          <div><span className="text-gray-600">トーン:</span> <span className="text-gray-900">{settings.tone}</span></div>
                          {settings.features && settings.features.length > 0 && (
                            <div>
                              <span className="text-gray-600">機能:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {settings.features.map((feature, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">未設定</p>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </SNSLayout>
  );
}

