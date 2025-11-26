import toast from "react-hot-toast";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface NotificationOptions {
  type: NotificationType;
  message: string;
  description?: string;
  duration?: number;
}

/**
 * トースト通知を表示する
 */
export function notify(options: NotificationOptions | string): void {
  // 文字列のみの場合は success として扱う
  if (typeof options === "string") {
    toast.success(options);
    return;
  }

  const { type, message, description, duration = 4000 } = options;

  switch (type) {
    case "success":
      toast.success(message, {
        duration,
        ...(description && {
          description,
        }),
      });
      break;
    case "error":
      toast.error(message, {
        duration,
        ...(description && {
          description,
        }),
      });
      break;
    case "info":
      toast(message, {
        duration,
        icon: "ℹ️",
        ...(description && {
          description,
        }),
      });
      break;
    case "warning":
      toast(message, {
        duration,
        icon: "⚠️",
        ...(description && {
          description,
        }),
      });
      break;
  }
}

