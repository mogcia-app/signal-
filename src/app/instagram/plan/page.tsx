'use client'

import React, { useState } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import SNSLayout from '../../../components/sns-layout'

export default function InstagramPlanPage() {
  const { user } = useAuth()
  
  // フォーム状態管理
  const [formData, setFormData] = useState({
    goalName: '',
    planPeriod: '1ヶ月',
    currentFollowers: '',
    followerGain: '',
    goalCategory: '',
    otherGoal: '',
    targetAudience: '',
    aiHelpRequest: '',
    pastLearnings: '',
    brandConcept: '',
    colorVisual: '',
    tone: '',
    weeklyFocus: '',
    feedFreq: '',
    reelFreq: '',
    storyFreq: '',
    saveGoal: '',
    likeGoal: '',
    reachGoal: '',
    referenceAccounts: '',
    hashtagStrategy: '',
    constraints: '',
    freeMemo: ''
  })

  // UI状態管理
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showAiAdvice, setShowAiAdvice] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  
  // シミュレーション関連の状態
  const [simulationResult, setSimulationResult] = useState<{
    targetDate: string;
    monthlyTarget: number;
    weeklyTarget: number;
    feasibilityLevel: string;
    feasibilityBadge: string;
    postsPerWeek: {
      reel: number;
      feed: number;
      story: number;
    };
    monthlyPostCount: number;
    workloadMessage: string;
    mainAdvice: string;
    improvementTips: string[];
  } | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationError, setSimulationError] = useState('')
  const [debugInfo, setDebugInfo] = useState<{
    step: string;
    requestData?: Record<string, unknown>;
    timestamp: string;
    status?: number;
    error?: string;
    details?: Record<string, unknown>;
    improvementTipsCount?: number;
    improvementTips?: string[];
  } | null>(null)

  // フォーム入力ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 戦略選択ハンドラー
  const handleStrategyToggle = (strategy: string) => {
    setSelectedStrategies(prev => 
      prev.includes(strategy)
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    )
  }

  // カテゴリ選択ハンドラー
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  // 計画保存（未使用のためコメントアウト）
  // const handleSavePlan = () => {
  //   console.log('計画を保存:', { ...formData, strategies: selectedStrategies, categories: selectedCategories })
  //   setShowToast(true)
  //   setTimeout(() => setShowToast(false), 3000)
  //   // TODO: API呼び出し
  // }

  // シミュレーション実行
  const handleRunSimulation = async () => {
    console.log('=== シミュレーション実行開始 ===')
    console.log('user:', user)
    console.log('formData:', formData)
    console.log('selectedStrategies:', selectedStrategies)
    console.log('selectedCategories:', selectedCategories)
    
    if (!user) {
      console.error('ユーザーがログインしていません')
      setSimulationError('ログインが必要です')
      return
    }

    if (!formData.followerGain || !formData.planPeriod) {
      console.error('必要な入力が不足しています:', { followerGain: formData.followerGain, planPeriod: formData.planPeriod })
      setSimulationError('目標フォロワー数と期間を入力してください')
      return
    }

    if (!formData.currentFollowers) {
      console.error('現在のフォロワー数が未入力です')
      setSimulationError('現在のフォロワー数を入力してください')
      return
    }

    console.log('バリデーション通過、シミュレーション実行中...')
    setIsSimulating(true)
    setSimulationError('')
    setDebugInfo(null)

    try {
      // const idToken = await user.getIdToken()
      // console.log('IDトークン取得成功')
      
      const requestData = {
        followerGain: parseInt(formData.followerGain, 10),
        currentFollowers: parseInt(formData.currentFollowers, 10) || 0,
        planPeriod: formData.planPeriod,
        goalCategory: formData.goalCategory,
        strategyValues: selectedStrategies,
        postCategories: selectedCategories,
        hashtagStrategy: formData.tone,
        referenceAccounts: formData.brandConcept
      }

      console.log('シミュレーション実行リクエストデータ:', requestData)
      
      // デバッグ情報を画面に表示
      setDebugInfo({
        step: 'リクエスト送信中',
        requestData: requestData,
        timestamp: new Date().toLocaleTimeString()
      })

      // 一時的にモックデータを使用
      setTimeout(() => {
        const mockResult = {
          targetDate: '2024年2月15日',
          monthlyTarget: Math.ceil(parseInt(formData.followerGain) / 1),
          weeklyTarget: Math.ceil(parseInt(formData.followerGain) / 4),
          feasibilityLevel: 'realistic',
          feasibilityBadge: '現実的',
          postsPerWeek: {
            reel: 2,
            feed: 3,
            story: 5
          },
          monthlyPostCount: 20,
          workloadMessage: '適度な負荷で継続可能',
          mainAdvice: 'リール中心の運用でフォロワー獲得を効率化しましょう。週2回のリール投稿と週3回のフィード投稿で目標達成が可能です。',
          improvementTips: [
            'ハッシュタグを15-20個使用してリーチを拡大',
            'ストーリーで日常的な交流を促進',
            '投稿時間を午後2-4時、夜8-10時に集中'
          ]
        }
        
        setSimulationResult(mockResult)
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
        
        setDebugInfo((prev) => prev ? ({
          ...prev,
          step: '完了',
          improvementTipsCount: mockResult.improvementTips.length,
          improvementTips: mockResult.improvementTips
        }) : null)
        
        setIsSimulating(false)
      }, 2000)

    } catch (error) {
      console.error('シミュレーションエラー:', error)
      setSimulationError('シミュレーション処理中にエラーが発生しました')
      setIsSimulating(false)
    }
  }

  // AI診断開始
  const handleStartAiDiagnosis = async () => {
    setIsAiLoading(true)
    try {
      // 実際のAI API呼び出し
      const response = await fetch('/api/ai/diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          planData: formData,
          currentData: formData 
        })
      })
      
      if (response.ok) {
        // const result = await response.json()
        setShowAiAdvice(true)
      } else {
        console.error('AI診断エラー:', response.statusText)
      }
    } catch (error) {
      console.error('AI診断エラー:', error)
    } finally {
      setIsAiLoading(false)
    }
  }

  // 戦略を保存して続行
  const handleSaveAdviceAndContinue = () => {
    console.log('AI戦略を保存')
    // TODO: AI戦略の保存処理
  }

  // 現在の計画編集
  const handleEditCurrentPlan = () => {
    console.log('現在の計画を編集')
    // TODO: 編集モードの切り替え
  }

  // 現在の計画削除
  const handleDeleteCurrentPlan = () => {
    console.log('現在の計画を削除')
    // TODO: 削除確認と実行
  }

  return (
    <SNSLayout currentSNS="instagram">
      <div className="max-w-7xl mx-auto">
        {/* ページヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Instagram 運用計画</h1>
          <p className="text-lg text-gray-600">
            強みを活かす、実行可能なSNS計画を立てましょう
          </p>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム：計画作成 */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">📋 計画を立てる</h3>
                <p className="text-sm text-gray-600">
                  <span className="text-yellow-500">★</span>はAIが参照するための必須項目です。具体的に記入するほど、精度の高いアドバイスが得られます。
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="goalName" className="block text-sm font-medium mb-1">計画タイトル</label>
                  <input
                    type="text"
                    id="goalName"
                    name="goalName"
                    value={formData.goalName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  />
                </div>

                {/* 必須ブロック */}
                <div>
                  <label htmlFor="planPeriod" className="block text-sm font-medium mb-1">
                    <span className="text-yellow-500">★</span>期間
                  </label>
                  <select
                    id="planPeriod"
                    name="planPeriod"
                    value={formData.planPeriod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  >
                    <option value="1ヶ月">1ヶ月（おすすめ）</option>
                    <option value="3ヶ月">3ヶ月</option>
                    <option value="6ヶ月">6ヶ月</option>
                    <option value="1年">1年</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    この計画は <span className="font-medium">{formData.planPeriod}</span> 単位で運用されます
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="currentFollowers" className="block text-sm font-medium mb-1">
                      <span className="text-yellow-500">★</span>現在のフォロワー数
                    </label>
                    <input
                      type="number"
                      id="currentFollowers"
                      name="currentFollowers"
                      value={formData.currentFollowers}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="followerGain" className="block text-sm font-medium mb-1">
                      <span className="text-yellow-500">★</span>目標フォロワー数
                    </label>
                    <input
                      type="number"
                      id="followerGain"
                      name="followerGain"
                      value={formData.followerGain}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="goalCategorySelect" className="block text-sm font-medium mb-1">
                    <span className="text-yellow-500">★</span>KPIカテゴリ
                  </label>
                  <select
                    id="goalCategorySelect"
                    name="goalCategory"
                    value={formData.goalCategory}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  >
                    <option value="">-- 選択してください --</option>
                    <option value="follower">フォロワー獲得</option>
                    <option value="engagement">エンゲージ促進</option>
                    <option value="like">いいねを増やす</option>
                    <option value="save">保存率向上</option>
                    <option value="reach">リーチを増やす</option>
                    <option value="impressions">インプレッションを増やす</option>
                    <option value="branding">ブランド認知を広める</option>
                    <option value="profile">プロフィール誘導</option>
                    <option value="other">その他</option>
                  </select>
                  {formData.goalCategory === 'other' && (
                    <input
                      type="text"
                      id="otherGoalInput"
                      name="otherGoal"
                      placeholder="その他の目標カテゴリ"
                      value={formData.otherGoal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent mt-2"
                    />
                  )}
                </div>

                {/* 戦略系 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <span className="text-yellow-500">★</span>施策（複数選択可）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'フィード投稿強化', 'リール中心運用', 'ストーリーで交流を深める',
                      'UGC活用', 'キャンペーン実施', '広告実施', 'コメント促進',
                      'カルーセル導線設計', 'ハッシュタグ見直し'
                    ].map((strategy) => (
                      <span
                        key={strategy}
                        className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          selectedStrategies.includes(strategy)
                            ? 'bg-[#ff8a15] text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => handleStrategyToggle(strategy)}
                      >
                        {strategy}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 投稿カテゴリ */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <span className="text-yellow-500">★</span>投稿カテゴリ
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'ノウハウ', '実績紹介', '世界観', '興味喚起', '比較',
                      'お悩み解決', 'ビフォーアフター', '共感メッセージ',
                      'ユーザーの声', 'キャンペーン・お知らせ', 'トレンド活用'
                    ].map((category) => (
                      <span
                        key={category}
                        className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          selectedCategories.includes(category)
                            ? 'bg-[#ff8a15] text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => handleCategoryToggle(category)}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="targetAudienceInput" className="block text-sm font-medium mb-1">
                      <span className="text-yellow-500">★</span>ターゲット層
                    </label>
                    <input
                      type="text"
                      id="targetAudienceInput"
                      name="targetAudience"
                      value={formData.targetAudience}
                      onChange={handleInputChange}
                      placeholder="例：SNS初心者の20〜30代女性 など"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                  </div>
                </div>

                <hr className="border-gray-200" />

                <div>
                  <label className="block text-sm font-medium mb-2">投稿頻度（週あたり）</label>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="number"
                      id="feedFreq"
                      name="feedFreq"
                      placeholder="フィード"
                      value={formData.feedFreq}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                    <input
                      type="number"
                      id="reelFreq"
                      name="reelFreq"
                      placeholder="リール"
                      value={formData.reelFreq}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                    <input
                      type="number"
                      id="storyFreq"
                      name="storyFreq"
                      placeholder="ストーリー"
                      value={formData.storyFreq}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="saveGoalInput" className="block text-sm font-medium mb-1">目標保存数</label>
                    <input
                      type="number"
                      id="saveGoalInput"
                      name="saveGoal"
                      value={formData.saveGoal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="likeGoalInput" className="block text-sm font-medium mb-1">目標いいね数</label>
                    <input
                      type="number"
                      id="likeGoalInput"
                      name="likeGoal"
                      value={formData.likeGoal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="reachGoalInput" className="block text-sm font-medium mb-1">目標リーチ数</label>
                    <input
                      type="number"
                      id="reachGoalInput"
                      name="reachGoal"
                      value={formData.reachGoal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="aiHelpRequest" className="block text-sm font-medium mb-1">
                    <span className="text-yellow-500">★</span>AIに相談したいこと
                  </label>
                  <textarea
                    id="aiHelpRequest"
                    name="aiHelpRequest"
                    value={formData.aiHelpRequest}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="pastLearnings" className="block text-sm font-medium mb-1">
                    <span className="text-yellow-500">★</span>前回の振り返り・学び
                  </label>
                  <textarea
                    id="pastLearnings"
                    name="pastLearnings"
                    value={formData.pastLearnings}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="referenceAccounts" className="block text-sm font-medium mb-1">参考にするアカウント・競合</label>
                  <textarea
                    id="referenceAccounts"
                    name="referenceAccounts"
                    value={formData.referenceAccounts}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="hashtagStrategy" className="block text-sm font-medium mb-1">ハッシュタグ戦略</label>
                  <textarea
                    id="hashtagStrategy"
                    name="hashtagStrategy"
                    value={formData.hashtagStrategy}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="constraints" className="block text-sm font-medium mb-1">運用リソース・制約条件</label>
                  <textarea
                    id="constraints"
                    name="constraints"
                    value={formData.constraints}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="freeMemo" className="block text-sm font-medium mb-1">メモ・補足</label>
                  <textarea
                    id="freeMemo"
                    name="freeMemo"
                    value={formData.freeMemo}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff8a15] focus:border-transparent"
                  />
                </div>

                {/* シミュレーション実行ボタン */}
                <div className="pt-6">
                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="w-full bg-[#ff8a15] hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-6 rounded-md transition-colors"
                  >
                    {isSimulating ? 'シミュレーション中...' : 'シミュレーション実行'}
                  </button>
                </div>
                
                {/* エラー表示 */}
                {simulationError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{simulationError}</p>
                  </div>
                )}

                {/* デバッグ情報表示 */}
                {debugInfo && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="text-blue-800 font-medium mb-2">🔍 デバッグ情報</h4>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p><strong>ステップ:</strong> {debugInfo.step}</p>
                      <p><strong>時刻:</strong> {debugInfo.timestamp}</p>
                      
                      {debugInfo.requestData && (
                        <div>
                          <strong>送信データ:</strong>
                          <pre className="mt-1 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(debugInfo.requestData, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {debugInfo.status && (
                        <p><strong>レスポンス状態:</strong> {debugInfo.status}</p>
                      )}
                      
                      {debugInfo.error && (
                        <p className="text-red-600"><strong>エラー:</strong> {debugInfo.error}</p>
                      )}
                      
                      {debugInfo.improvementTipsCount !== undefined && (
                        <div>
                          <p><strong>改善提案数:</strong> {debugInfo.improvementTipsCount}</p>
                          {debugInfo.improvementTips && debugInfo.improvementTips.length > 0 && (
                            <div>
                              <strong>改善提案:</strong>
                              <ul className="mt-1 list-disc list-inside">
                                {debugInfo.improvementTips.map((tip: string, index: number) => (
                                  <li key={index} className="text-xs">{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {showToast && (
                  <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50">
                    保存しました！
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右カラム：KPI・AIアドバイス */}
          <div className="space-y-4">
            
            {/* 1. 進行中の目標 */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">🎯</span>進行中の目標
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                {simulationResult ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      {formData.goalName || 'Instagram成長計画'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">目標フォロワー増加</span>
                        <div className="font-medium">+{formData.followerGain}人</div>
                      </div>
                      <div>
                        <span className="text-gray-600">期間</span>
                        <div className="font-medium">{formData.planPeriod}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">ターゲット</span>
                        <div className="font-medium">{formData.targetAudience || '未設定'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">カテゴリ</span>
                        <div className="font-medium">{formData.goalCategory || '未設定'}</div>
                      </div>
                    </div>
                    {selectedStrategies.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">選択した戦略</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedStrategies.map((strategy, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {strategy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    左側で計画を入力し、「シミュレーション実行」ボタンを押してください
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEditCurrentPlan}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
                >
                  編集する
                </button>
                <button
                  onClick={handleDeleteCurrentPlan}
                  className="bg-red-200 hover:bg-red-300 text-red-700 px-3 py-2 rounded text-sm transition-colors"
                >
                  削除する
                </button>
              </div>
            </section>

            {/* 2. 投稿目標シミュレーション */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">📊</span>目標達成シミュレーション
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {simulationResult ? (
                  <div className="space-y-4">
                    {/* メイン目標（横長） */}
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-900 mb-1">
                        {parseInt(formData.currentFollowers) + parseInt(formData.followerGain)}人
                      </div>
                      <div className="text-sm text-blue-700 mb-2">目標フォロワー数</div>
                      <div className="text-xs text-blue-600 mb-2">
                        現在 {parseInt(formData.currentFollowers)}人 → 目標 {parseInt(formData.currentFollowers) + parseInt(formData.followerGain)}人（+{formData.followerGain}人）
                      </div>
                      <div className="text-sm text-blue-800 font-medium">
                        📅 達成期限：{simulationResult.targetDate}
                      </div>
                    </div>

                    {/* サブKPI（2つ並び） */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white rounded-md">
                        <div className="text-xl font-bold text-gray-900 mb-1">
                          {simulationResult.monthlyTarget}人/月
                        </div>
                        <div className="text-sm text-gray-600">月間目標</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-md">
                        <div className="text-xl font-bold text-gray-900 flex items-center justify-center space-x-2 mb-1">
                          <span>{simulationResult.weeklyTarget}人/週</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            simulationResult.feasibilityLevel === 'very_realistic' 
                              ? 'bg-blue-100 text-blue-800'
                              : simulationResult.feasibilityLevel === 'realistic'
                              ? 'bg-green-100 text-green-800'
                              : simulationResult.feasibilityLevel === 'moderate'
                              ? 'bg-yellow-100 text-yellow-800'
                              : simulationResult.feasibilityLevel === 'challenging'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {simulationResult.feasibilityBadge}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">週間目標</div>
                      </div>
                    </div>

                    {/* 投稿計画テーブル */}
                    <div className="bg-white rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left">投稿タイプ</th>
                            <th className="px-3 py-2 text-center">週間必要数</th>
                            <th className="px-3 py-2 text-center">フォロワー効果</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-gray-200">
                            <td className="px-3 py-2">リール</td>
                            <td className="px-3 py-2 text-center font-medium">{simulationResult.postsPerWeek.reel}回</td>
                            <td className="px-3 py-2 text-center text-green-600">+3人/投稿</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="px-3 py-2">フィード</td>
                            <td className="px-3 py-2 text-center font-medium">{simulationResult.postsPerWeek.feed}回</td>
                            <td className="px-3 py-2 text-center text-blue-600">+2人/投稿</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="px-3 py-2">ストーリー</td>
                            <td className="px-3 py-2 text-center font-medium">{simulationResult.postsPerWeek.story}回</td>
                            <td className="px-3 py-2 text-center text-purple-600">+1人/投稿</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 投稿負荷情報 */}
                    <div className="bg-gray-100 p-4 rounded-md text-center">
                      <div className="text-lg font-bold text-gray-900 mb-1">
                        {simulationResult.monthlyPostCount}投稿/月
                      </div>
                      <div className="text-sm text-gray-700">
                        📊 {simulationResult.workloadMessage}
                      </div>
                    </div>

                    {/* メインアドバイス */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-md border-l-4 border-orange-400">
                      <div className="text-sm text-orange-800">
                        {simulationResult.mainAdvice}
                      </div>
                    </div>

                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    左側で目標を入力し、「シミュレーション実行」ボタンを押すとシミュレーション結果が表示されます
                  </p>
                )}
              </div>
            </section>

            {/* 3. AI診断セクション */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <span className="mr-2">🤖</span>AIによる投稿戦略アドバイス
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                目標や施策をもとに、AIが最適な方向性を提案します。
              </p>

              <button
                onClick={handleStartAiDiagnosis}
                className="w-full bg-[#ff8a15] hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-md transition-colors mb-4"
              >
                ▶ 診断を開始する
              </button>
              
              {isAiLoading && (
                <p className="text-center text-gray-600">
                  診断中です…
                </p>
              )}

              {/* 診断出力エリア */}
              {showAiAdvice && (
                <div className="space-y-6">
                  <h4 className="font-semibold text-lg">提案内容</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium mb-2">① 全体の投稿戦略</h5>
                      <p className="text-sm text-gray-600">
                        フォロワー獲得を重視した戦略として、週3回のフィード投稿と週2回のリール投稿を推奨します。
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">② 投稿構成の方向性</h5>
                      <p className="text-sm text-gray-600">
                        共感→価値→行動の流れで構成し、保存を促すCTAを各投稿に配置することをお勧めします。
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">③ カスタマージャーニー別の投稿役割</h5>
                      <div className="text-sm text-gray-600">
                        <p>認知段階：ブランド世界観の投稿</p>
                        <p>興味段階：ノウハウ・価値提案</p>
                        <p>検討段階：商品紹介・比較</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">④ 注意点・成功のコツ</h5>
                      <p className="text-sm text-gray-600">
                        一貫性のある投稿スケジュールを維持し、フォロワーの期待値を定めることが重要です。
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">⑤ 世界観診断</h5>
                      <p className="text-sm text-gray-600 mb-3">
                        AIがあなたのブランド情報から分析した結果、Instagramでは以下のような世界観が最適です。
                      </p>

                      <ul className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <li>
                          <strong>ブランドコンセプト：</strong><br />
                          <span className="text-gray-600">
                            {formData.brandConcept || '未設定'}
                          </span>
                        </li>
                        <li>
                          <strong>メインカラー：</strong>
                          <span className="text-gray-600">
                            {formData.colorVisual || '未設定'}
                          </span>
                          <span className="inline-block w-5 h-5 ml-2 border border-gray-400 rounded align-middle bg-[#ff8a15]"></span>
                        </li>
                        <li>
                          <strong>サブカラー：</strong>
                          <span className="text-gray-600">
                            白・グレー
                          </span>
                          <div className="inline-flex space-x-1 ml-2">
                            <span className="w-4 h-4 bg-white border border-gray-400 rounded"></span>
                            <span className="w-4 h-4 bg-gray-400 rounded"></span>
                          </div>
                        </li>
                        <li>
                          <strong>文章トーン：</strong>
                          <span className="text-gray-600">
                            {formData.tone || '未設定'}
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">⑥ フィード投稿提案</h5>
                      <div className="text-sm text-gray-600">
                        <p>• 週3回の投稿で一貫性を保つ</p>
                        <p>• 画像の質と構成を重視</p>
                        <p>• ハッシュタグは15-20個を推奨</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">⑦ リール投稿提案</h5>
                      <div className="text-sm text-gray-600">
                        <p>• 週2回の投稿でトレンドを活用</p>
                        <p>• 最初の3秒で興味を引く</p>
                        <p>• 音楽とテキストの組み合わせを重視</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">⑧ ストーリー投稿提案</h5>
                      <div className="text-sm text-gray-600">
                        <p>• 日常的な投稿で親近感を演出</p>
                        <p>• インタラクティブ要素を活用</p>
                        <p>• 24時間で消える特性を活かした臨場感</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      className="w-full bg-[#ff8a15] hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-md transition-colors"
                      onClick={handleSaveAdviceAndContinue}
                    >
                      この戦略を保存する
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </SNSLayout>
  )
}
