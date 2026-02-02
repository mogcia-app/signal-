"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle, Eye } from "lucide-react";

interface PostEditorSuccessMessageProps {
  show: boolean;
  onViewPosts?: () => void;
}

export const PostEditorSuccessMessage: React.FC<PostEditorSuccessMessageProps> = ({
  show,
  onViewPosts,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="mx-6 mb-4 p-4 bg-white border border-orange-200">
      <div className="flex items-center">
        <CheckCircle size={20} className="text-orange-600 mr-3" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-800">投稿が保存されました！</p>
          <p className="text-xs text-orange-600 mt-1">投稿一覧ページで確認できます。</p>
        </div>
        <div className="flex space-x-2">
          <Link
            href="/instagram/posts"
            className="inline-flex items-center px-3 py-1 text-xs bg-[#ff8a15] text-white hover:bg-orange-600 transition-colors"
          >
            <Eye size={12} className="mr-1" />
            投稿一覧を見る
          </Link>
        </div>
      </div>
    </div>
  );
};


