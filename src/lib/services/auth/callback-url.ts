const DEFAULT_AUTH_CALLBACK_URL = '/profile';
const DEFAULT_APP_ORIGIN = 'https://tvsync.app';
const MAX_NORMALIZE_ATTEMPTS = 3;

export const getApplicationOrigin = () => {
  try {
    return new URL(
      process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? DEFAULT_APP_ORIGIN
    ).origin;
  } catch {
    return DEFAULT_APP_ORIGIN;
  }
};

const normalizeDangerousUrlCharacters = (value: string) => {
  let normalized = value;

  for (let attempt = 0; attempt < MAX_NORMALIZE_ATTEMPTS; attempt += 1) {
    const nextValue = normalized
      .replaceAll(/%25/gi, '%')
      .replaceAll(/%2f/gi, '/')
      .replaceAll(/%5c/gi, '\\');

    if (nextValue === normalized) {
      return normalized;
    }

    normalized = nextValue;
  }

  return normalized;
};

export const getSafeCallbackUrl = (
  callbackUrl?: string,
  baseOrigin = getApplicationOrigin()
) => {
  if (!callbackUrl) {
    return DEFAULT_AUTH_CALLBACK_URL;
  }

  const candidate = callbackUrl.trim();

  try {
    const normalizedCandidate = normalizeDangerousUrlCharacters(candidate);

    if (
      !(candidate.startsWith('/') && normalizedCandidate.startsWith('/')) ||
      candidate.startsWith('//') ||
      normalizedCandidate.startsWith('//') ||
      candidate.includes('\\') ||
      normalizedCandidate.includes('\\')
    ) {
      return DEFAULT_AUTH_CALLBACK_URL;
    }

    const parsedUrl = new URL(candidate, baseOrigin);

    if (parsedUrl.origin !== baseOrigin) {
      return DEFAULT_AUTH_CALLBACK_URL;
    }

    return candidate;
  } catch {
    return DEFAULT_AUTH_CALLBACK_URL;
  }
};

export const getSafeAuthRedirectUrl = (url: string, baseUrl: string) => {
  try {
    const base = new URL(baseUrl);
    const requestedUrl = new URL(url, base);

    if (requestedUrl.origin !== base.origin) {
      return baseUrl;
    }

    const safePath = getSafeCallbackUrl(
      `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`,
      base.origin
    );

    return new URL(safePath, base).toString();
  } catch {
    return baseUrl;
  }
};
