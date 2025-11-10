import { authFetch } from "./authFetch";

let installed = false;

const isApiRequest = (url: string) => {
  if (!url) {
    return false;
  }

  if (url.startsWith("/api")) {
    return true;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (url.startsWith(`${origin}/api`)) {
      return true;
    }
  }

  return false;
};

const normalizeRequestInit = async (
  input: Request,
  overrideInit?: RequestInit,
): Promise<RequestInit> => {
  const cloned = input.clone();
  const baseInit: RequestInit = {
    method: cloned.method,
    headers: Array.from(cloned.headers.entries()).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {},
    ),
    credentials: cloned.credentials,
    cache: cloned.cache,
    redirect: cloned.redirect,
    referrer: cloned.referrer,
    referrerPolicy: cloned.referrerPolicy,
    mode: cloned.mode,
    integrity: cloned.integrity,
    keepalive: cloned.keepalive,
    signal: overrideInit?.signal ?? cloned.signal,
  };

  const hasBody =
    cloned.method !== "GET" && cloned.method !== "HEAD" && overrideInit?.body === undefined;

  if (hasBody) {
    const bodyText = await cloned.text();
    baseInit.body = bodyText;
  }

  return {
    ...baseInit,
    ...overrideInit,
    headers: {
      ...(baseInit.headers as Record<string, string>),
      ...(overrideInit?.headers as Record<string, string> | undefined),
    },
  };
};

export const installAuthFetch = () => {
  if (installed || typeof window === "undefined") {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url: string;

    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
    }

    if (!isApiRequest(url)) {
      return originalFetch(input, init);
    }

    if (input instanceof Request) {
      const normalizedInit = await normalizeRequestInit(input, init);
      return authFetch(url, normalizedInit, originalFetch);
    }

    return authFetch(url, init ?? {}, originalFetch);
  };

  installed = true;
};



