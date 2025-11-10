type NotificationType = "success" | "error" | "info";

export type AppNotificationDetail = {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
};

type ConfirmOptions = {
  id: string;
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

const NOTIFICATION_EVENT = "app-notification";
const CONFIRM_EVENT = "app-confirm";

const confirmResolvers = new Map<string, (result: boolean) => void>();

export function notify({
  type,
  message,
  duration,
}: {
  type: NotificationType;
  message: string;
  duration?: number;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const detail: AppNotificationDetail = {
    id,
    type,
    message,
    duration,
  };

  window.dispatchEvent(new CustomEvent<AppNotificationDetail>(NOTIFICATION_EVENT, { detail }));
}

export function requestConfirmation({
  message,
  description,
  confirmLabel,
  cancelLabel,
}: {
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(true);
  }

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const payload: ConfirmOptions = {
    id,
    message,
    description,
    confirmLabel,
    cancelLabel,
  };

  return new Promise<boolean>((resolve) => {
    confirmResolvers.set(id, resolve);
    window.dispatchEvent(new CustomEvent<ConfirmOptions>(CONFIRM_EVENT, { detail: payload }));
  });
}

export function resolveConfirmation(id: string, result: boolean) {
  const resolver = confirmResolvers.get(id);
  if (resolver) {
    resolver(result);
    confirmResolvers.delete(id);
  }
}

export const notificationEvents = {
  NOTIFICATION_EVENT,
  CONFIRM_EVENT,
};


