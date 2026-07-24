import 'server-only';

import { digestRateLimitKey } from 'lib/services/auth/security';
import { consumeAuthRateLimit } from 'lib/services/database/auth.server';

/**
 * The public TMDB proxy forwards to a single shared TMDB API key, so an
 * unthrottled client could exhaust that key's rate budget for everyone. This
 * caps how many uncached proxy requests a single IP can make per window. The
 * limit is generous — normal debounced search and browsing stay well under it,
 * and the CDN/Data Cache already absorbs repeat reads — so only abusive bursts
 * are shed. It reuses the existing HMAC-keyed `auth_rate_limits` table rather
 * than storing raw IPs.
 */
const PROXY_RATE_LIMIT = { limit: 120, windowSeconds: 60 } as const;
const PROXY_RATE_LIMIT_SCOPE = 'tmdb-proxy:ip';

export const checkTmdbProxyRateLimit = (
  ipAddress: string
): Promise<boolean> => {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    // Without a secret the limiter cannot key requests safely. Fail open so a
    // misconfigured preview environment still serves content, matching how the
    // rest of the app degrades when AUTH_SECRET is absent.
    return Promise.resolve(true);
  }

  return consumeAuthRateLimit({
    keyDigest: digestRateLimitKey(`tmdb-proxy|${ipAddress}`, secret),
    limit: PROXY_RATE_LIMIT.limit,
    scope: PROXY_RATE_LIMIT_SCOPE,
    windowSeconds: PROXY_RATE_LIMIT.windowSeconds,
  });
};
