"use client";

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from "react";

interface ProgressContextType {
  progress: number; // 0-100
  isVisible: boolean;
  setProgress: (progress: number) => void;
  showProgress: () => void;
  hideProgress: () => void;
  resetProgress: () => void;
  incrementProgress: (amount: number) => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // クリーンアップ関数
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setProgress = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    setProgressState(clampedValue);
    
    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsVisible((prevVisible) => {
      if (clampedValue > 0 && !prevVisible) {
        return true;
      }
      return prevVisible;
    });
    
    if (clampedValue >= 100) {
      // 100%になったら少し待ってから非表示
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setProgressState(0);
        timeoutRef.current = null;
      }, 300);
    }
  }, []);

  const showProgress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(true);
    setProgressState(0);
  }, []);

  const hideProgress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
    setProgressState(0);
  }, []);

  const resetProgress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setProgressState(0);
    setIsVisible(false);
  }, []);

  const incrementProgress = useCallback((amount: number) => {
    setProgressState((prev) => {
      const newValue = Math.max(0, Math.min(100, prev + amount));
      setIsVisible((prevVisible) => {
        if (newValue > 0 && !prevVisible) {
          return true;
        }
        return prevVisible;
      });
      return newValue;
    });
  }, []);

  return (
    <ProgressContext.Provider
      value={{
        progress,
        isVisible,
        setProgress,
        showProgress,
        hideProgress,
        resetProgress,
        incrementProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}

