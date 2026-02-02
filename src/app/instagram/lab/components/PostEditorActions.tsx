"use client";

import React from "react";
import { Save, RefreshCw } from "lucide-react";

interface PostEditorActionsProps {
  onSave: () => void;
  onClear: () => void;
  isSaving: boolean;
  canSave: boolean;
}

export const PostEditorActions: React.FC<PostEditorActionsProps> = ({
  onSave,
  onClear,
  isSaving,
  canSave,
}) => {
  return (
    <div className="flex space-x-3 mt-6">
      <button
        onClick={onSave}
        disabled={!canSave || isSaving}
        className="flex items-center space-x-2 px-4 py-2 bg-[#ff8a15] text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>保存中...</span>
          </>
        ) : (
          <>
            <Save size={14} />
            <span>保存</span>
          </>
        )}
      </button>
      <button
        onClick={onClear}
        className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
      >
        <RefreshCw size={14} />
        <span>クリア</span>
      </button>
    </div>
  );
};

