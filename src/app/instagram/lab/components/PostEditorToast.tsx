"use client";

import React from "react";
import { CheckCircle, X } from "lucide-react";

interface PostEditorToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export const PostEditorToast: React.FC<PostEditorToastProps> = ({
  message,
  type,
  onClose,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div
        className={`flex items-center space-x-3 px-4 py-3 min-w-[300px] max-w-md ${
          type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}
      >
        {type === "success" ? (
          <CheckCircle size={20} className="flex-shrink-0" />
        ) : (
          <X size={20} className="flex-shrink-0" />
        )}
        <p className="font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
          aria-label="閉じる"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};









