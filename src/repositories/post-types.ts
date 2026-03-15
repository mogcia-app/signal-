import type { AIReference } from "@/types/ai";
import type { SnapshotReference as BaseSnapshotReference } from "@/types/ai";

export type PostStatus = "draft" | "scheduled" | "published";
export type PostType = "feed" | "reel" | "story";

export type SnapshotReference = Omit<BaseSnapshotReference, "score" | "summary"> & {
  score?: number;
  summary?: string;
};

export interface PostAnalyticsData {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date;
}

export interface FirestorePostDocument {
  userId: string;
  title: string;
  content: string;
  hashtags?: string[];
  postType?: PostType;
  scheduledDate?: string | Date | FirebaseFirestore.Timestamp | null;
  scheduledTime?: string | null;
  status?: PostStatus;
  imageUrl?: string | null;
  analytics?: PostAnalyticsData | null;
  snapshotReferences?: SnapshotReference[];
  generationReferences?: AIReference[];
  createdAt?: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

export interface PostRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: PostType;
  scheduledDate: Date | string | null;
  scheduledTime: string | null;
  status: PostStatus;
  imageUrl: string | null;
  analytics: PostAnalyticsData | null;
  snapshotReferences: SnapshotReference[];
  generationReferences: AIReference[];
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CreatePostInput {
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: PostType;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  status: PostStatus;
  imageUrl?: string | null;
  analytics?: PostAnalyticsData | null;
  snapshotReferences?: SnapshotReference[];
  generationReferences?: AIReference[];
}

export interface PostListFilters {
  userId: string;
  status?: string | null;
  postType?: string | null;
  limit?: number;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  hashtags?: string[];
  postType?: PostType;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  status?: PostStatus;
  imageUrl?: string | null;
  analytics?: Record<string, unknown>;
  imageData?: null;
}
