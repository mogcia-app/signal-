'use client';

import React from 'react';

interface KPIDiagnosisProps {
  content: string;
  hashtags: string[];
  postType?: 'tweet' | 'thread' | 'reply';
}

export const KPIDiagnosis: React.FC<KPIDiagnosisProps> = ({ content, hashtags, postType = 'tweet' }) => {
  const getEngagementScore = () => {
    let score = 0;
    
    // 投稿タイプ別の文字数制限チェック（X版は140文字）
    const maxLength = postType === 'tweet' ? 140 : postType === 'thread' ? 2800 : 140;
    const minLength = postType === 'reply' ? 10 : 20;
    
    if (content.length >= minLength && content.length <= maxLength) {
      score += 25;
    } else if (content.length > 0) {
      score += 10; // 制限内でない場合は部分点
    }
    
    // ハッシュタグ数によるスコア（X版は1-2個が最適）
    if (hashtags.length >= 1 && hashtags.length <= 2) {
      score += 20;
    } else if (hashtags.length === 0) {
      score += 5; // ハッシュタグなしでもOK
    } else if (hashtags.length > 2) {
      score += 5; // 多すぎる場合は減点
    }
    
    // X版特有のエンゲージメント要素
    const xEngagementWords = [
      '質問', '?', '！', 'みなさん', 'どう思う', '意見', '感想',
      'RT', 'リツイート', '拡散', 'シェア', '共有',
      'フォロー', 'フォロワー', 'みんな', '皆さん'
    ];
    const hasEngagement = xEngagementWords.some(word => content.includes(word));
    if (hasEngagement) {
      score += 20;
    }
    
    // 感情的な表現のチェック
    const emotionalWords = ['嬉しい', '楽しい', '驚いた', '感動', '感謝', 'ありがとう', '😊', '😍', '🤔', '💭'];
    const hasEmotion = emotionalWords.some(word => content.includes(word));
    if (hasEmotion) {
      score += 15;
    }
    
    // X版の話題性・リアルタイム性
    const trendingWords = ['今', '最新', '話題', 'トレンド', '注目', '速報', 'NEW', '新着'];
    const hasTrending = trendingWords.some(word => content.includes(word));
    if (hasTrending) {
      score += 10;
    }
    
    // リプライ特有の要素
    if (postType === 'reply') {
      const replyWords = ['@', 'ありがとう', '同感', 'そうですね', '確かに', 'なるほど'];
      const hasReplyElements = replyWords.some(word => content.includes(word));
      if (hasReplyElements) {
        score += 10;
      }
    }
    
    // スレッド特有の要素
    if (postType === 'thread') {
      const threadWords = ['続く', '1/', '2/', '3/', 'スレッド', '詳しく', '詳細'];
      const hasThreadElements = threadWords.some(word => content.includes(word));
      if (hasThreadElements) {
        score += 10;
      }
    }
    
    return Math.min(score, 100);
  };

  const engagementScore = getEngagementScore();
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '優秀';
    if (score >= 60) return '良好';
    return '改善必要';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">エンゲージメント診断</h3>
      </div>
      <div className="p-6 space-y-4">
        {/* スコア表示 */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getScoreColor(engagementScore)}`}>
            {engagementScore}
          </div>
          <div className={`text-sm font-medium ${getScoreColor(engagementScore)}`}>
            {getScoreLabel(engagementScore)}
          </div>
        </div>

        {/* 詳細分析 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">文字数 ({postType})</span>
            <span className={`text-sm font-medium ${
              content.length >= (postType === 'reply' ? 10 : 20) && 
              content.length <= (postType === 'thread' ? 2800 : 140) ? 'text-green-600' : 'text-red-600'
            }`}>
              {content.length}/{postType === 'thread' ? '2800' : '140'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">ハッシュタグ数</span>
            <span className={`text-sm font-medium ${hashtags.length >= 1 && hashtags.length <= 2 ? 'text-green-600' : 'text-yellow-600'}`}>
              {hashtags.length}個
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">エンゲージメント要素</span>
            <span className="text-sm font-medium text-green-600">
              {content.includes('?') || content.includes('！') || content.includes('みなさん') || content.includes('RT') ? 'あり' : 'なし'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">感情表現</span>
            <span className="text-sm font-medium text-green-600">
              {content.includes('😊') || content.includes('嬉しい') || content.includes('楽しい') ? 'あり' : 'なし'}
            </span>
          </div>
          
          {postType === 'reply' && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">リプライ要素</span>
              <span className="text-sm font-medium text-green-600">
                {content.includes('@') || content.includes('ありがとう') || content.includes('同感') ? 'あり' : 'なし'}
              </span>
            </div>
          )}
          
          {postType === 'thread' && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">スレッド要素</span>
              <span className="text-sm font-medium text-green-600">
                {content.includes('続く') || content.includes('1/') || content.includes('スレッド') ? 'あり' : 'なし'}
              </span>
            </div>
          )}
        </div>

        {/* 改善提案 */}
        {engagementScore < 80 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">改善提案:</div>
              <ul className="text-xs space-y-1">
                {content.length === 0 && <li>• 投稿内容を入力してください</li>}
                {content.length > (postType === 'thread' ? 2800 : 140) && <li>• 文字数を{postType === 'thread' ? '2800' : '140'}文字以内に調整してください</li>}
                {content.length < (postType === 'reply' ? 10 : 20) && content.length > 0 && <li>• もう少し詳しく内容を書いてみてください</li>}
                {hashtags.length > 2 && <li>• ハッシュタグを2個以内に減らしてください（X版は1-2個が最適）</li>}
                {!content.includes('?') && !content.includes('！') && !content.includes('みなさん') && <li>• 質問や感嘆符でエンゲージメントを促進</li>}
                {!content.includes('😊') && !content.includes('嬉しい') && !content.includes('楽しい') && <li>• 感情的な表現や絵文字を追加してみてください</li>}
                {postType === 'reply' && !content.includes('@') && !content.includes('ありがとう') && <li>• リプライらしい要素（@、感謝の言葉）を追加</li>}
                {postType === 'thread' && !content.includes('続く') && !content.includes('1/') && <li>• スレッドらしい要素（「続く」「1/」など）を追加</li>}
              </ul>
            </div>
          </div>
        )}
        
        {/* X版特有のヒント */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">X版のコツ:</div>
            <ul className="text-xs space-y-1">
              <li>• リアルタイム性を意識した投稿を心がける</li>
              <li>• ハッシュタグは1-2個に絞る</li>
              <li>• 質問や話題性のある内容でエンゲージメントを促進</li>
              <li>• 感情的な表現や絵文字を効果的に使用</li>
              {postType === 'thread' && <li>• スレッドは「続く」「1/2」などで連続性を表現</li>}
              {postType === 'reply' && <li>• リプライは相手への敬意と感謝を表現</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIDiagnosis;
