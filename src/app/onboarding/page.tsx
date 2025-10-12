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
  const { user, loading: authLoading } = useAuth();
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
    targetMarket: '',
    catchphrase: ''
  });
  const [customIndustry, setCustomIndustry] = useState('');

  // ステップ2: 目標・課題
  const [goals, setGoals] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [customChallenge, setCustomChallenge] = useState('');

  // 商品・サービス情報
  const [productsOrServices, setProductsOrServices] = useState<Array<{ id: string; name: string; details: string }>>([]);
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // ステップ3: SNS AI設定
  const [snsAISettings, setSnsAISettings] = useState<Record<string, { 
    enabled: boolean; 
    tone?: string; 
    features?: string[];
    manner?: string;
    cautions?: string;
    goals?: string;
    motivation?: string;
    additionalInfo?: string;
  }>>({});
  const [customFeature, setCustomFeature] = useState('');

  // ユーザープロファイルからデータを読み込む
  useEffect(() => {
    if (userProfile?.businessInfo) {
      setBusinessInfo({
        industry: userProfile.businessInfo.industry || '',
        companySize: userProfile.businessInfo.companySize || '',
        businessType: userProfile.businessInfo.businessType || '',
        description: userProfile.businessInfo.description || '',
        targetMarket: userProfile.businessInfo.targetMarket || '',
        catchphrase: userProfile.businessInfo.catchphrase || ''
      });
      setGoals(userProfile.businessInfo.goals || []);
      setChallenges(userProfile.businessInfo.challenges || []);
      setProductsOrServices(userProfile.businessInfo.productsOrServices || []);
    }
    if (userProfile?.snsAISettings) {
      setSnsAISettings(userProfile.snsAISettings as Record<string, { enabled: boolean; tone?: string; features?: string[] }>);
    }
  }, [userProfile]);

  useEffect(() => {
    // loading中はリダイレクトしない（Firebase初期化待ち）
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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

  // 商品・サービスの追加
  const addProduct = () => {
    if (!productName.trim()) {
      alert('項目名を入力してください');
      return;
    }

    const newProduct = {
      id: Date.now().toString(),
      name: productName.trim(),
      details: productDetails.trim()
    };

    setProductsOrServices([...productsOrServices, newProduct]);
    setProductName('');
    setProductDetails('');
  };

  // 商品・サービスの編集
  const startEditProduct = (product: { id: string; name: string; details: string }) => {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDetails(product.details);
  };

  const saveEditProduct = () => {
    if (!editingProductId || !productName.trim()) return;

    setProductsOrServices(productsOrServices.map(p => 
      p.id === editingProductId 
        ? { ...p, name: productName.trim(), details: productDetails.trim() }
        : p
    ));
    setEditingProductId(null);
    setProductName('');
    setProductDetails('');
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
    setProductName('');
    setProductDetails('');
  };

  // 商品・サービスの削除
  const removeProduct = (id: string) => {
    setProductsOrServices(productsOrServices.filter(p => p.id !== id));
  };

  // 完了処理
  const handleComplete = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // 業種が「その他」の場合はカスタム業種を使用
      const finalIndustry = businessInfo.industry === 'その他' && customIndustry.trim() 
        ? customIndustry.trim() 
        : businessInfo.industry;
      
      await updateDoc(userDocRef, {
        businessInfo: {
          ...businessInfo,
          industry: finalIndustry,
          goals,
          challenges,
          productsOrServices
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
  const isStep3Valid = Object.keys(snsAISettings).length > 0 && 
    Object.values(snsAISettings).some(s => s.enabled && s.tone && s.tone.trim());

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
      <div className="py-6">
        <div className="max-w-full">
        {/* ユーザー情報セクション */}
        {userProfile && (
          <div className="mb-6 bg-white border-l-4 border-[#FF8A15] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">ユーザー情報</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 text-xs font-medium ${
                  userProfile.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-[#FF8A15] text-white'
                }`}>
                  {userProfile.status === 'active' ? '✓ アクティブ' : '初期設定待ち'}
                </span>
                <span className="px-3 py-1 border-2 border-[#FF8A15] text-[#FF8A15] text-xs font-medium">
                  {userProfile.contractType === 'annual' ? '年間契約' : 'トライアル'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* 名前 */}
              <div className="border border-gray-200 p-4">
                <label className="flex items-center text-xs font-medium text-gray-600 mb-2">
                  <User className="h-3 w-3 mr-1 text-[#FF8A15]" />
                  名前
                </label>
                <p className="text-gray-900 font-semibold">{userProfile.name}</p>
              </div>

              {/* メールアドレス */}
              <div className="border border-gray-200 p-4">
                <label className="flex items-center text-xs font-medium text-gray-600 mb-2">
                  <Mail className="h-3 w-3 mr-1 text-[#FF8A15]" />
                  メールアドレス
                </label>
                <p className="text-gray-900 font-semibold text-sm break-all">{userProfile.email}</p>
              </div>

              {/* 契約期間 */}
              <div className="border border-gray-200 p-4">
                <label className="flex items-center text-xs font-medium text-gray-600 mb-2">
                  <Calendar className="h-3 w-3 mr-1 text-[#FF8A15]" />
                  契約期間
                </label>
                <p className="text-gray-900 font-semibold text-sm">
                  {new Date(userProfile.contractStartDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  {' 〜 '}
                  {new Date(userProfile.contractEndDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </p>
              </div>
            </div>

            {/* 契約SNS */}
            {userProfile.contractSNS && userProfile.contractSNS.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-xs font-medium text-gray-600 mb-3">契約SNS</label>
                <div className="flex flex-wrap gap-2">
                  {userProfile.contractSNS.map((sns) => (
                    <div
                      key={sns}
                      className="flex items-center space-x-2 px-3 py-2 bg-white border border-[#FF8A15]"
                    >
                      <span className="text-lg">
                        {sns === 'instagram' ? '📷' : 
                         sns === 'x' ? '🐦' : 
                         sns === 'tiktok' ? '🎵' : 
                         sns === 'youtube' ? '📺' : '📱'}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm capitalize">
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
        <div className="mb-6 bg-white border-l-4 border-[#FF8A15] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-[#FF8A15]" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">御社専用AI設定</h2>
                <p className="text-sm text-gray-600">
                  {userProfile?.businessInfo?.industry 
                    ? 'いただいたヒアリングをもとに組み込んでいます'
                    : 'ビジネスに最適化されたAIを構築します'
                  }
                </p>
              </div>
            </div>
            {!isEditing && userProfile?.businessInfo?.industry && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#FF8A15] text-white hover:bg-[#E67A0A] transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>編集</span>
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setCurrentStep(1);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>キャンセル</span>
              </button>
            )}
          </div>
        </div>

        {/* 進行状況バー（編集モード時のみ） */}
        {(isEditing || !userProfile?.businessInfo?.industry) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">ステップ {currentStep} / {totalSteps}</span>
            <span className="text-sm font-medium text-[#FF8A15]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 h-2 overflow-hidden">
            <div
              className="h-full bg-[#FF8A15] transition-all duration-500 ease-out"
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
                  className={`flex items-center justify-center w-8 h-8 border-2 transition-all ${
                    step < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : step === currentStep
                      ? 'bg-[#FF8A15] border-[#FF8A15] text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold text-sm">{step}</span>
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
        <div className="bg-white border border-gray-200 p-6">
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
                        className={`p-3 border-2 text-sm font-medium transition-all ${
                          businessInfo.industry === option
                            ? 'border-[#FF8A15] bg-white text-[#FF8A15]'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {/* 「その他」選択時のテキスト入力 */}
                  {businessInfo.industry === 'その他' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customIndustry}
                        onChange={(e) => setCustomIndustry(e.target.value)}
                        placeholder="業種を入力してください"
                        className="w-full px-4 py-2 border-2 border-[#FF8A15] focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
                      />
                    </div>
                  )}
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
                            ? 'border-[#FF8A15] bg-white text-[#FF8A15]'
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
                  <input
                    type="text"
                    value={businessInfo.businessType}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, businessType: e.target.value })}
                    placeholder="例: BtoC、BtoB、BtoB/BtoC両方など"
                    className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                  />
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
                            ? 'border-[#FF8A15] bg-white text-[#FF8A15]'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* キャッチコピー */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💬 キャッチコピー
                    <span className="ml-2 text-xs text-gray-500">（AIが参照します）</span>
                  </label>
                  <input
                    type="text"
                    value={businessInfo.catchphrase || ''}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, catchphrase: e.target.value })}
                    placeholder="例: あなたの美しさを最大限に引き出す、プロの技術"
                    className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 ブランドの核心を表す一文を入力してください
                  </p>
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

                {/* 商品・サービス・政策情報 */}
                <div className="border-t-2 border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📦 商品・サービス・政策情報
                    <span className="ml-2 text-xs text-gray-500">（AIが参照します）</span>
                  </label>
                  
                  {/* 入力フォーム */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder={
                          businessInfo.industry === '美容・健康' ? '例: カット' :
                          businessInfo.industry === '飲食' ? '例: ランチセット' :
                          businessInfo.industry === '教育' ? '例: 英会話コース' :
                          '例: 商品名、サービス名、政策名'
                        }
                        className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={productDetails}
                        onChange={(e) => setProductDetails(e.target.value)}
                        placeholder={
                          businessInfo.industry === '美容・健康' ? '例: ¥4,000 - 丁寧なカット施術' :
                          businessInfo.industry === '飲食' ? '例: ¥980 - 日替わりメイン+サラダ+ドリンク' :
                          businessInfo.industry === '教育' ? '例: 月額¥15,000 - マンツーマンレッスン' :
                          '例: 価格や詳細を入力'
                        }
                        className="flex-1 px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                      />
                      {editingProductId ? (
                        <>
                          <button
                            onClick={saveEditProduct}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 transition-colors flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            保存
                          </button>
                          <button
                            onClick={cancelEditProduct}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={addProduct}
                          className="bg-[#FF8A15] hover:bg-orange-600 text-white px-6 py-2 transition-colors font-medium"
                        >
                          追加
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 追加された商品・サービス一覧 */}
                  {productsOrServices.length > 0 && (
                    <div className="space-y-2">
                      {productsOrServices.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200 border-l-4 border-l-[#FF8A15] p-3 flex items-start justify-between group hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏷️</span>
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                            </div>
                            {item.details && (
                              <p className="text-sm text-gray-600 mt-1 ml-7">{item.details}</p>
                            )}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditProduct(item)}
                              className="text-blue-600 hover:text-blue-700 text-sm px-2 py-1"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => removeProduct(item.id)}
                              className="text-red-600 hover:text-red-700 text-sm px-2 py-1"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {productsOrServices.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                      商品、サービス、または政策を追加してください
                    </p>
                  )}
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
                            ? 'border-[#FF8A15] bg-white text-[#FF8A15]'
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
                  {/* カスタム目標追加 */}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="カスタム目標を追加"
                      className="flex-1 px-4 py-2 border-2 border-gray-200 focus:outline-none focus:border-[#FF8A15]"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customGoal.trim()) {
                          setGoals([...goals, customGoal.trim()]);
                          setCustomGoal('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (customGoal.trim()) {
                          setGoals([...goals, customGoal.trim()]);
                          setCustomGoal('');
                        }
                      }}
                      className="px-4 py-2 bg-[#FF8A15] text-white hover:bg-[#E67A0A] transition-colors"
                    >
                      追加
                    </button>
                  </div>
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
                  {/* カスタム課題追加 */}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customChallenge}
                      onChange={(e) => setCustomChallenge(e.target.value)}
                      placeholder="カスタム課題を追加"
                      className="flex-1 px-4 py-2 border-2 border-gray-200 focus:outline-none focus:border-[#FF8A15]"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customChallenge.trim()) {
                          setChallenges([...challenges, customChallenge.trim()]);
                          setCustomChallenge('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (customChallenge.trim()) {
                          setChallenges([...challenges, customChallenge.trim()]);
                          setCustomChallenge('');
                        }
                      }}
                      className="px-4 py-2 bg-[#FF8A15] text-white hover:bg-[#E67A0A] transition-colors"
                    >
                      追加
                    </button>
                  </div>
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
                <div className="p-6 bg-white border-2 border-[#FF8A15]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">📷</span>
                      <h3 className="text-xl font-bold text-gray-900">Instagram AI設定</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={snsAISettings.instagram?.enabled || false}
                        onChange={(e) => {
                          setSnsAISettings({
                            ...snsAISettings,
                            instagram: {
                              ...snsAISettings.instagram,
                              enabled: e.target.checked,
                              tone: snsAISettings.instagram?.tone || '',
                              features: snsAISettings.instagram?.features || [],
                              manner: snsAISettings.instagram?.manner || '',
                              cautions: snsAISettings.instagram?.cautions || '',
                              goals: snsAISettings.instagram?.goals || '',
                              motivation: snsAISettings.instagram?.motivation || '',
                              additionalInfo: snsAISettings.instagram?.additionalInfo || ''
                            }
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF8A15] peer-focus:ring-opacity-30 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF8A15]"></div>
                    </label>
                  </div>

                  {snsAISettings.instagram?.enabled && (
                    <div className="space-y-4">
                      {/* トーン入力 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          トーン <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={snsAISettings.instagram?.tone || ''}
                          onChange={(e) => {
                            setSnsAISettings({
                              ...snsAISettings,
                              instagram: {
                                ...snsAISettings.instagram,
                                enabled: true,
                                tone: e.target.value,
                                features: snsAISettings.instagram?.features || []
                              }
                            });
                          }}
                          placeholder="例: フレンドリー、プロフェッショナル、カジュアルなど"
                          className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                        />
                      </div>

                      {/* マナー */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          マナー・ルール
                        </label>
                        <textarea
                          value={snsAISettings.instagram?.manner || ''}
                          onChange={(e) => {
                            setSnsAISettings({
                              ...snsAISettings,
                              instagram: {
                                ...snsAISettings.instagram,
                                enabled: true,
                                manner: e.target.value
                              }
                            });
                          }}
                          placeholder="例: 絵文字は控えめに、敬語を使う、業界用語は避けるなど"
                          className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                          rows={3}
                        />
                      </div>

                      {/* 注意事項 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          注意事項・NGワード
                        </label>
                        <textarea
                          value={snsAISettings.instagram?.cautions || ''}
                          onChange={(e) => {
                            setSnsAISettings({
                              ...snsAISettings,
                              instagram: {
                                ...snsAISettings.instagram,
                                enabled: true,
                                cautions: e.target.value
                              }
                            });
                          }}
                          placeholder="例: 競合他社名は使わない、特定の表現は避けるなど"
                          className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                          rows={3}
                        />
                      </div>

                      {/* Instagram目標 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Instagram運用の目標
                        </label>
                        <textarea
                          value={snsAISettings.instagram?.goals || ''}
                          onChange={(e) => {
                            setSnsAISettings({
                              ...snsAISettings,
                              instagram: {
                                ...snsAISettings.instagram,
                                enabled: true,
                                goals: e.target.value
                              }
                            });
                          }}
                          placeholder="例: 3ヶ月で1万フォロワー達成、エンゲージメント率5%以上など"
                          className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                          rows={3}
                        />
                      </div>

                      {/* 運用動機 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Instagramを始めた理由・動機
                        </label>
                        <textarea
                          value={snsAISettings.instagram?.motivation || ''}
                          onChange={(e) => {
                            setSnsAISettings({
                              ...snsAISettings,
                              instagram: {
                                ...snsAISettings.instagram,
                                enabled: true,
                                motivation: e.target.value
                              }
                            });
                          }}
                          placeholder="例: ブランド認知度を上げたい、顧客とのコミュニケーションを強化したいなど"
                          className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                          rows={3}
                        />
                      </div>

                      {/* その他AI参考情報 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          その他AIに伝えたい情報
                        </label>
                        <textarea
                          value={snsAISettings.instagram?.additionalInfo || ''}
                          onChange={(e) => {
                            setSnsAISettings({
                              ...snsAISettings,
                              instagram: {
                                ...snsAISettings.instagram,
                                enabled: true,
                                additionalInfo: e.target.value
                              }
                            });
                          }}
                          placeholder="例: 投稿頻度の希望、好きなインフルエンサー、参考にしたいアカウントなど"
                          className="w-full px-4 py-2 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
                          rows={3}
                        />
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
                      {/* カスタム機能追加 */}
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={customFeature}
                          onChange={(e) => setCustomFeature(e.target.value)}
                          placeholder="カスタム機能を追加"
                          className="flex-1 px-4 py-2 border-2 border-gray-200 focus:outline-none focus:border-[#FF8A15]"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && customFeature.trim()) {
                              const currentFeatures = snsAISettings.instagram?.features || [];
                              setSnsAISettings({
                                ...snsAISettings,
                                instagram: {
                                  ...snsAISettings.instagram,
                                  enabled: true,
                                  tone: snsAISettings.instagram?.tone || 'フレンドリー',
                                  features: [...currentFeatures, customFeature.trim()]
                                }
                              });
                              setCustomFeature('');
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (customFeature.trim()) {
                              const currentFeatures = snsAISettings.instagram?.features || [];
                              setSnsAISettings({
                                ...snsAISettings,
                                instagram: {
                                  ...snsAISettings.instagram,
                                  enabled: true,
                                  tone: snsAISettings.instagram?.tone || 'フレンドリー',
                                  features: [...currentFeatures, customFeature.trim()]
                                }
                              });
                              setCustomFeature('');
                            }
                          }}
                          className="px-4 py-2 bg-[#FF8A15] text-white hover:bg-[#E67A0A] transition-colors"
                        >
                          追加
                        </button>
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
                    : 'bg-[#FF8A15] text-white hover:bg-[#E67A0A] shadow-lg hover:shadow-xl'
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
            <div className="bg-white border border-gray-200 border-l-4 border-l-[#FF8A15] p-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">💬 キャッチコピー</label>
                  <p className="text-gray-900 font-medium">{businessInfo.catchphrase || '未設定'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">事業内容</label>
                  <p className="text-gray-900">{businessInfo.description || '未設定'}</p>
                </div>
              </div>

              {/* 商品・サービス・政策情報 */}
              {productsOrServices.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📦 商品・サービス・政策情報
                  </label>
                  <div className="space-y-2">
                    {productsOrServices.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 border-l-4 border-l-[#FF8A15] p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🏷️</span>
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        </div>
                        {item.details && (
                          <p className="text-sm text-gray-600 mt-1 ml-7">{item.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 目標・課題 */}
            <div className="bg-white border border-gray-200 border-l-4 border-l-[#FF8A15] p-6">
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
            <div className="bg-white border border-gray-200 border-l-4 border-l-[#FF8A15] p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">SNS AI設定</h3>
              <div className="space-y-4">
                {Object.keys(snsAISettings).length > 0 ? (
                  Object.entries(snsAISettings).map(([snsType, settings]) => {
                    const extendedSettings = settings as {
                      enabled: boolean;
                      tone?: string;
                      features?: string[];
                      manner?: string;
                      cautions?: string;
                      goals?: string;
                      motivation?: string;
                      additionalInfo?: string;
                    };
                    
                    return (
                      <div key={snsType} className="p-4 border-2 border-[#FF8A15]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">
                              {snsType === 'instagram' ? '📷' : snsType === 'x' ? '🐦' : '📱'}
                            </span>
                            <span className="font-bold text-gray-900 text-lg capitalize">{snsType}</span>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium ${
                            extendedSettings.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {extendedSettings.enabled ? '✓ 有効' : '無効'}
                          </span>
                        </div>
                        {extendedSettings.enabled && (
                          <div className="space-y-3 text-sm">
                            {extendedSettings.tone && (
                              <div className="pb-2 border-b border-gray-200">
                                <span className="text-gray-600 font-medium">トーン:</span>
                                <p className="text-gray-900 mt-1">{extendedSettings.tone}</p>
                              </div>
                            )}
                            {extendedSettings.manner && (
                              <div className="pb-2 border-b border-gray-200">
                                <span className="text-gray-600 font-medium">マナー・ルール:</span>
                                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{extendedSettings.manner}</p>
                              </div>
                            )}
                            {extendedSettings.cautions && (
                              <div className="pb-2 border-b border-gray-200">
                                <span className="text-gray-600 font-medium">注意事項・NGワード:</span>
                                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{extendedSettings.cautions}</p>
                              </div>
                            )}
                            {extendedSettings.goals && (
                              <div className="pb-2 border-b border-gray-200">
                                <span className="text-gray-600 font-medium">Instagram運用の目標:</span>
                                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{extendedSettings.goals}</p>
                              </div>
                            )}
                            {extendedSettings.motivation && (
                              <div className="pb-2 border-b border-gray-200">
                                <span className="text-gray-600 font-medium">運用動機:</span>
                                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{extendedSettings.motivation}</p>
                              </div>
                            )}
                            {extendedSettings.additionalInfo && (
                              <div className="pb-2 border-b border-gray-200">
                                <span className="text-gray-600 font-medium">その他AI参考情報:</span>
                                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{extendedSettings.additionalInfo}</p>
                              </div>
                            )}
                            {extendedSettings.features && extendedSettings.features.length > 0 && (
                              <div>
                                <span className="text-gray-600 font-medium">機能:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {extendedSettings.features.map((feature, idx) => (
                                    <span key={idx} className="px-2 py-1 border border-[#FF8A15] text-[#FF8A15] text-xs">
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
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

