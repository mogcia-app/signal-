"use client";

import React from "react";

export const PostEditorHeader: React.FC = () => {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-[#ff8a15] to-orange-600 flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">📝</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">投稿文エディター</h2>
            <p className="text-sm text-gray-700">投稿文を作成・編集しましょう</p>
          </div>
        </div>
      </div>
    </div>
  );
};











