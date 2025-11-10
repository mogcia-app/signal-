import * as Sentry from "@sentry/nextjs";
import type { SeverityLevel } from "@sentry/nextjs";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface BaseLogPayload {
  level: LogLevel;
  event: string;
  timestamp: string;
  environment: string;
  data?: Record<string, unknown>;
}

const SECURITY_WEBHOOK_URL =
  process.env.SECURITY_LOG_WEBHOOK_URL ??
  process.env.DATADOG_SECURITY_WEBHOOK_URL ??
  process.env.STACKDRIVER_WEBHOOK_URL ??
  "";

const hasSentryDsn = Boolean(process.env.SENTRY_DSN);

const sentryLevelMap: Record<LogLevel, SeverityLevel> = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warning",
  ERROR: "error",
};

async function sendExternalLog(payload: BaseLogPayload) {
  if (hasSentryDsn) {
    try {
      Sentry.withScope((scope) => {
        scope.setLevel(sentryLevelMap[payload.level]);
        scope.setContext("security_payload", {
          event: payload.event,
          environment: payload.environment,
          data: payload.data ?? {},
        });
        scope.setTag("security_event", payload.event);
        scope.setExtra("environment", payload.environment);
        Sentry.captureMessage(payload.event, sentryLevelMap[payload.level]);
      });
    } catch (error) {
      console.error("Failed to send security log to Sentry", error);
    }
  }

  if (!SECURITY_WEBHOOK_URL) {
    console.log(`[${payload.level}] ${payload.event}`, payload);
    return;
  }

  try {
    await fetch(SECURITY_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to send external security log", {
      error: error instanceof Error ? error.message : String(error),
      payload,
    });
  }
}

export async function logSecurityEvent(event: string, data?: Record<string, unknown>, level: LogLevel = "WARN") {
  const payload: BaseLogPayload = {
    event,
    level,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "unknown",
    data,
  };

  await sendExternalLog(payload);
}

export async function logAccessEvent(event: string, data?: Record<string, unknown>, level: LogLevel = "INFO") {
  const payload: BaseLogPayload = {
    event,
    level,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "unknown",
    data,
  };

  await sendExternalLog(payload);
}


