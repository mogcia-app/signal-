export function getLabEditorHref(
  postType: string,
  postId?: string | null,
  extraParams?: Record<string, string>
): string | null {
  if (!postId) {
    return null;
  }

  const params = new URLSearchParams({
    postId,
    from: "monthly-report",
    ...extraParams,
  });

  switch (postType) {
    case "feed":
      return `/instagram/lab/feed?${params.toString()}`;
    case "reel":
      return `/instagram/lab/reel?${params.toString()}`;
    case "story":
      return `/instagram/lab/story?${params.toString()}`;
    default:
      return `/instagram/lab/feed?${params.toString()}`;
  }
}

export function getAnalyticsHref(postType: string, postId?: string | null): string | null {
  if (!postId) {
    return null;
  }

  switch (postType) {
    case "feed":
      return `/analytics/feed?postId=${postId}`;
    case "reel":
      return `/instagram/analytics/reel?postId=${postId}`;
    default:
      return null;
  }
}

