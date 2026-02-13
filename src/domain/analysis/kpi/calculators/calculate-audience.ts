import type { AudienceBreakdown, PostWithAnalytics } from "@/domain/analysis/kpi/types";

interface AnalyticsSummaryWithAudience {
  audience?: {
    gender?: { male: number; female: number; other: number };
    age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
  } | null;
}

export function calculateAudienceAnalysis(postsWithAnalytics: PostWithAnalytics[]): AudienceBreakdown {
  const postsWithAudience = postsWithAnalytics.filter(
    (post) => post.analyticsSummary && (post.analyticsSummary as AnalyticsSummaryWithAudience).audience
  );

  if (postsWithAudience.length === 0) {
    return {
      gender: { male: 0, female: 0, other: 0 },
      age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0 },
    };
  }

  const audienceData = postsWithAudience.map(
    (post) => (post.analyticsSummary as AnalyticsSummaryWithAudience).audience
  );

  const avgGender = {
    male: audienceData.reduce((sum, data) => sum + (data?.gender?.male || 0), 0) / audienceData.length,
    female: audienceData.reduce((sum, data) => sum + (data?.gender?.female || 0), 0) / audienceData.length,
    other: audienceData.reduce((sum, data) => sum + (data?.gender?.other || 0), 0) / audienceData.length,
  };

  const avgAge = {
    "18-24": audienceData.reduce((sum, data) => sum + (data?.age?.["18-24"] || 0), 0) / audienceData.length,
    "25-34": audienceData.reduce((sum, data) => sum + (data?.age?.["25-34"] || 0), 0) / audienceData.length,
    "35-44": audienceData.reduce((sum, data) => sum + (data?.age?.["35-44"] || 0), 0) / audienceData.length,
    "45-54": audienceData.reduce((sum, data) => sum + (data?.age?.["45-54"] || 0), 0) / audienceData.length,
  };

  return { gender: avgGender, age: avgAge };
}
