"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  type AppNotificationDetail,
  notificationEvents,
  resolveConfirmation,
} from "../lib/ui/notifications";

type ConfirmState = {
  id: string;
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

const TOAST_DURATION = 4000;

export function AppNotifications() {
  const [notifications, setNotifications] = useState<AppNotificationDetail[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<AppNotificationDetail>;
      const detail = customEvent.detail;
      setNotifications((prev) => [...prev, detail]);

      const timeoutId = window.setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== detail.id));
        timersRef.current.delete(detail.id);
      }, detail.duration ?? TOAST_DURATION);

      timers.set(detail.id, timeoutId);
    };

    const handleConfirm = (event: Event) => {
      const customEvent = event as CustomEvent<ConfirmState>;
      setConfirmState(customEvent.detail);
    };

    window.addEventListener(notificationEvents.NOTIFICATION_EVENT, handleNotification);
    window.addEventListener(notificationEvents.CONFIRM_EVENT, handleConfirm);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      window.removeEventListener(notificationEvents.NOTIFICATION_EVENT, handleNotification);
      window.removeEventListener(notificationEvents.CONFIRM_EVENT, handleConfirm);
    };
  }, []);

  const dismissNotification = useCallback((id: string) => {
    const timerId = timersRef.current.get(id);
    if (typeof timerId === "number") {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleConfirm = useCallback(
    (result: boolean) => {
      if (confirmState) {
        resolveConfirmation(confirmState.id, result);
        setConfirmState(null);
      }
    },
    [confirmState],
  );

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3">
        {notifications.map((toast) => (
          <div
            key={toast.id}
            className={`w-72 rounded-lg shadow-lg px-4 py-3 text-sm text-white transition-all ${
              toast.type === "success"
                ? "bg-emerald-500"
                : toast.type === "error"
                  ? "bg-red-500"
                  : "bg-blue-500"
            }`}
          >
            <div className="flex items-start justify-between space-x-3">
              <p className="flex-1 leading-relaxed">{toast.message}</p>
              <button
                type="button"
                className="text-white/80 hover:text-white"
                onClick={() => dismissNotification(toast.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">{confirmState.message}</h3>
            {confirmState.description && (
              <p className="mt-2 text-sm text-gray-600">{confirmState.description}</p>
            )}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => handleConfirm(false)}
              >
                {confirmState.cancelLabel ?? "キャンセル"}
              </button>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                onClick={() => handleConfirm(true)}
              >
                {confirmState.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


