interface WeeklyContentPlanProps {
  weeklyPlans: Array<{
    week: number;
    targetFollowers: number;
    increase: number;
    theme: string;
    feedPosts: Array<{ day: string; content: string; type?: string }>;
    storyContent: string | string[];
  }>;
}

export default function WeeklyContentPlan({ weeklyPlans }: WeeklyContentPlanProps) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">【週ごとのコンテンツ計画】</h3>
      <div className="space-y-4">
        {weeklyPlans.map((week, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-2">
              <p className="font-semibold text-gray-900">
                Week {week.week}  目標: {week.targetFollowers.toLocaleString()}人(+{week.increase})
                {index === weeklyPlans.length - 1 && <span className="text-[#FF8A15] ml-1">🎉</span>}
              </p>
            </div>
            <div className="border-t border-gray-200 my-2"></div>
            <p className="font-medium text-gray-800 mb-2">テーマ: {week.theme}</p>
            <div className="space-y-1 text-sm text-gray-700 mb-2">
              <p className="font-medium text-gray-800">【メイン投稿】</p>
              {week.feedPosts.map((post, postIdx) => (
                <p key={postIdx} className="ml-2">
                  {post.day}: {post.content}
                  {post.type === "reel" && <span className="text-[#FF8A15] ml-1">★</span>}
                </p>
              ))}
            </div>
            {((Array.isArray(week.storyContent) && week.storyContent.length > 0) || (!Array.isArray(week.storyContent) && week.storyContent)) && (
              <div className="mt-2">
                <p className="font-medium text-gray-800 text-sm mb-1">【ストーリーズ】</p>
                {Array.isArray(week.storyContent) ? (
                  <div className="space-y-1 text-sm text-gray-700">
                    {week.storyContent.map((story, storyIdx) => (
                      <p key={storyIdx} className="ml-2">{story}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 ml-2">{week.storyContent}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}





