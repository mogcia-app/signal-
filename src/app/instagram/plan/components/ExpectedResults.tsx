interface ExpectedResultsProps {
  expectedResults: {
    monthlyReach: number;
    engagementRate: string;
    profileViews: number;
    saves: number;
    newFollowers: number;
  };
}

export default function ExpectedResults({ expectedResults }: ExpectedResultsProps) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">📊 予想される成果</h3>
      <div className="space-y-1 text-sm text-gray-700">
        <p>月間リーチ数: 約{expectedResults.monthlyReach.toLocaleString()}人</p>
        <p>エンゲージメント率: {expectedResults.engagementRate}</p>
        <p>プロフィールアクセス: 約{expectedResults.profileViews}回</p>
        <p>保存数: {expectedResults.saves}回前後</p>
        <p>新規フォロワー: 約{expectedResults.newFollowers}人</p>
      </div>
    </div>
  );
}





