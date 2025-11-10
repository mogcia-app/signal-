import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: true,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "unknown",
  maxBreadcrumbs: 50,
  attachStacktrace: true,

  beforeSend(event, _hint) {
    return event;
  },

  ignoreErrors: [
    "NetworkError",
    "Failed to fetch",
    "Network request failed",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection",
  ],

  initialScope: {
    tags: {
      component: "signal-app",
    },
  },
});
