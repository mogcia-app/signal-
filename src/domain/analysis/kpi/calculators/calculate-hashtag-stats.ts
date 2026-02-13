import type { PostWithAnalytics } from "@/domain/analysis/kpi/types";

export interface HashtagStat {
  hashtag: string;
  count: number;
}

export function calculateHashtagStats(posts: PostWithAnalytics[]): HashtagStat[] {
  const hashtagCounts: { [key: string]: number } = {};

  posts.forEach((post) => {
    if (post.hashtags) {
      let hashtagsArray: string[] = [];

      if (Array.isArray(post.hashtags)) {
        post.hashtags.forEach((item) => {
          if (typeof item === "string") {
            let text = item.trim();
            const hashtagPattern = /#([^\s#,]+)/g;
            const matches = [...text.matchAll(hashtagPattern)];

            if (matches.length > 1) {
              matches.forEach((match) => {
                const tag = match[1].trim();
                if (tag) {
                  hashtagsArray.push(tag);
                }
              });
            } else {
              text = text.replace(/^#+/, "").trim();
              text.split(/[\s,]+/).forEach((tag) => {
                const cleanedTag = tag.replace(/^#+/, "").trim();
                if (cleanedTag) {
                  hashtagsArray.push(cleanedTag);
                }
              });
            }
          } else {
            hashtagsArray.push(String(item).replace(/^#+/, "").trim());
          }
        });
        hashtagsArray = hashtagsArray.filter((tag) => tag);
      } else if (typeof post.hashtags === "string") {
        let text = post.hashtags.trim();

        const hashtagPattern = /#([^\s#,]+)/g;
        const matches = [...text.matchAll(hashtagPattern)];

        if (matches.length > 1) {
          hashtagsArray = matches.map((match) => match[1].trim()).filter((tag) => tag);
        } else {
          text = text.replace(/^#+/, "").trim();
          hashtagsArray = text
            .split(/[\s,]+/)
            .map((tag) => tag.replace(/^#+/, "").trim())
            .filter((tag) => tag.length > 0);
        }

        if (process.env.NODE_ENV === "development" && hashtagsArray.length > 0) {
          console.log(`[HashtagStats] Original: "${post.hashtags}", Parsed:`, hashtagsArray);
        }
      }

      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach((hashtag) => {
          const normalizedHashtag = hashtag.replace(/^#+/, "").trim();
          if (normalizedHashtag) {
            hashtagCounts[normalizedHashtag] = (hashtagCounts[normalizedHashtag] || 0) + 1;
          }
        });
      }
    }
  });

  return Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([hashtag, count]) => ({ hashtag, count }));
}
