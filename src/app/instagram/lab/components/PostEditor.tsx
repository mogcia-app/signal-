"use client";

import type { SnapshotReference as AISnapshotReference } from "../../../../types/ai";

// 一時停止: 旧 投稿ラボコンポーネント
type NullableString = string | null;

export type AIHintSuggestion = {
  text?: string;
  imageStyle?: string;
};

export type SnapshotReference = AISnapshotReference;

export interface PostEditorProps {
  title?: NullableString;
  content?: NullableString;
}

export const PostEditor = () => null;

export default PostEditor;
