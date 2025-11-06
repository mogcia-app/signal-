"use client";

import React from "react";

interface PostFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedPostType: string;
  setSelectedPostType: (type: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  onRefresh: () => void;
  filteredPostsCount: number;
}

const PostFilters: React.FC<PostFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedStatus,
  setSelectedStatus,
  selectedPostType,
  setSelectedPostType,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  showFilters,
  setShowFilters,
  onRefresh,
  filteredPostsCount,
}) => {
  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6">
      <div className="space-y-4">
        {/* 検索バー */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="タイトル、内容、ハッシュタグで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-black hover:text-black"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* フィルター */}
        <div className="space-y-4">
          {/* フィルターヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">フィルター</span>
                {(selectedStatus || selectedPostType || dateFrom || dateTo) && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {[selectedStatus, selectedPostType, dateFrom, dateTo].filter(Boolean).length}
                  </span>
                )}
              </button>

              {/* アクティブフィルター表示 */}
              <div className="flex items-center space-x-2">
                {selectedStatus && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {selectedStatus === "created"
                      ? "作成済み"
                      : selectedStatus === "analyzed"
                        ? "分析済み"
                        : selectedStatus}
                  </span>
                )}
                {selectedPostType && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {selectedPostType === "feed"
                      ? "📸フィード"
                      : selectedPostType === "reel"
                        ? "🎬リール"
                        : selectedPostType === "story"
                          ? "📱ストーリーズ"
                          : selectedPostType}
                  </span>
                )}
                {(dateFrom || dateTo) && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    📅 日付指定
                  </span>
                )}
              </div>
            </div>

            {/* 更新ボタン */}
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-lg hover:from-slate-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>更新</span>
            </button>
          </div>

          {/* フィルター詳細（開閉式） */}
          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* ステータス・タイプフィルター */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ステータスフィルター */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">ステータス</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "", label: "すべて" },
                      { value: "created", label: "作成済み" },
                      { value: "analyzed", label: "分析済み" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedStatus(option.value)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          selectedStatus === option.value
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-white text-black border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 投稿タイプフィルター */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">タイプ</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "", label: "すべて", icon: "📝" },
                      { value: "feed", label: "フィード", icon: "📸" },
                      { value: "reel", label: "リール", icon: "🎬" },
                      { value: "story", label: "ストーリーズ", icon: "📱" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedPostType(option.value)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                          selectedPostType === option.value
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-white text-black border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 日付フィルター */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">公開日</span>
                <div className="flex items-center space-x-3">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="開始日"
                  />
                  <span className="text-black">〜</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="終了日"
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="px-3 py-2 text-sm text-black hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      ✕ クリア
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 検索結果表示 */}
        {searchTerm && (
          <div className="text-sm text-black">
            「{searchTerm}」の検索結果: {filteredPostsCount}件
          </div>
        )}
      </div>
    </div>
  );
};

export default PostFilters;
