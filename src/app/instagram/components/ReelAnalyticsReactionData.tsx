"use client";

import React from "react";
import { Heart, MessageCircle, Share, Save, Plus } from "lucide-react";
import { InputData } from "./types";

interface ReelAnalyticsReactionDataProps {
  data: InputData;
  onInputChange: (field: keyof InputData, value: string) => void;
}

export const ReelAnalyticsReactionData: React.FC<ReelAnalyticsReactionDataProps> = ({
  data,
  onInputChange,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">リール反応データ</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
            <Heart className="w-4 h-4 mr-2 text-[#ff8a15]" />
            いいね数
          </label>
          <input
            type="number"
            min="0"
            value={data.likes}
            onChange={(e) => onInputChange("likes", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
            <MessageCircle className="w-4 h-4 mr-2 text-[#ff8a15]" />
            コメント数
          </label>
          <input
            type="number"
            min="0"
            value={data.comments}
            onChange={(e) => onInputChange("comments", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
            <Share className="w-4 h-4 mr-2 text-[#ff8a15]" />
            シェア数
          </label>
          <input
            type="number"
            min="0"
            value={data.shares}
            onChange={(e) => onInputChange("shares", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
            <Share className="w-4 h-4 mr-2 text-[#ff8a15]" />
            リポスト数
          </label>
          <input
            type="number"
            min="0"
            value={data.reposts}
            onChange={(e) => onInputChange("reposts", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
            <Save className="w-4 h-4 mr-2 text-[#ff8a15]" />
            保存数
          </label>
          <input
            type="number"
            min="0"
            value={data.saves}
            onChange={(e) => onInputChange("saves", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="flex text-sm font-medium text-gray-700 mb-3 items-center">
            <Plus className="w-4 h-4 mr-2 text-[#ff8a15]" />
            フォロワー増加数
          </label>
          <input
            type="number"
            min="0"
            value={data.followerIncrease}
            onChange={(e) => onInputChange("followerIncrease", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};

