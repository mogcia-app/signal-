"use client";

import { authFetch } from "@/utils/authFetch";

const SIDEBAR_SESSION_KEY = "signal_sidebar_session_id";

const ensureSessionId = (): string => {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const existing = window.sessionStorage.getItem(SIDEBAR_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const generated = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SIDEBAR_SESSION_KEY, generated);
  return generated;
};

export type SidebarClickPayload = {
  buttonId: string;
  label: string;
  href: string;
  currentPath: string;
};

export const trackSidebarClick = (payload: SidebarClickPayload) => {
  const sessionId = ensureSessionId();

  void authFetch("/api/ui-events/sidebar-click", {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({
      ...payload,
      sessionId,
      clickedAt: new Date().toISOString(),
    }),
  }).catch((error) => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[sidebar-click] tracking failed", error);
    }
  });
};

export type PageButtonClickPayload = {
  buttonId: string;
  label: string;
  pagePath: string;
  currentPath: string;
};

export const trackPageButtonClick = (payload: PageButtonClickPayload) => {
  const sessionId = ensureSessionId();

  void authFetch("/api/ui-events/page-button-click", {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({
      ...payload,
      sessionId,
      clickedAt: new Date().toISOString(),
    }),
  }).catch((error) => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[page-button-click] tracking failed", error);
    }
  });
};
