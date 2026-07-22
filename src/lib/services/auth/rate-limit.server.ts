import 'server-only';

import { getAuthRateLimitKeyDigests } from 'lib/services/auth/security';
import { consumeAuthRateLimit } from 'lib/services/database/auth.server';
import { headers } from 'next/headers';

export const AUTH_RATE_LIMITS = {
  forgotPassword: { limit: 5, windowSeconds: 60 * 60 },
  login: { limit: 10, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  resendVerification: { limit: 3, windowSeconds: 60 * 60 },
  resetPassword: { limit: 5, windowSeconds: 60 * 60 },
} as const;

const getRequiredRateLimitSecret = () => {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('AUTH_SECRET is required for authentication rate limits.');
  }

  return secret;
};

export const getClientIp = (
  headerValues:
    | { get: (name: string) => string | null }
    | Record<string, unknown>
    | undefined
) => {
  if (!headerValues) {
    return 'unknown';
  }

  let forwarded: unknown;

  if ('get' in headerValues && typeof headerValues.get === 'function') {
    forwarded =
      headerValues.get('x-forwarded-for') ?? headerValues.get('x-real-ip');
  } else {
    const headerRecord = headerValues as Record<string, unknown>;
    forwarded = headerRecord['x-forwarded-for'] ?? headerRecord['x-real-ip'];
  }
  const value = Array.isArray(forwarded) ? forwarded.at(0) : forwarded;

  return typeof value === 'string'
    ? (value.split(',').at(0)?.trim() ?? 'unknown')
    : 'unknown';
};

export const checkAuthRateLimit = (input: {
  discriminator: string;
  ipAddress: string;
  rule: keyof typeof AUTH_RATE_LIMITS;
}) => {
  const rule = AUTH_RATE_LIMITS[input.rule];
  const { identityKeyDigest, ipKeyDigest } = getAuthRateLimitKeyDigests({
    discriminator: input.discriminator,
    ipAddress: input.ipAddress,
    secret: getRequiredRateLimitSecret(),
  });

  return Promise.all([
    consumeAuthRateLimit({
      keyDigest: identityKeyDigest,
      limit: rule.limit,
      scope: `${input.rule}:identity`,
      windowSeconds: rule.windowSeconds,
    }),
    consumeAuthRateLimit({
      keyDigest: ipKeyDigest,
      limit: rule.limit * 5,
      scope: `${input.rule}:ip`,
      windowSeconds: rule.windowSeconds,
    }),
  ]).then(([identityAllowed, ipAllowed]) => identityAllowed && ipAllowed);
};

export const checkRequestAuthRateLimit = async (
  rule: keyof typeof AUTH_RATE_LIMITS,
  discriminator: string
) => {
  const requestHeaders = await headers();

  return checkAuthRateLimit({
    discriminator,
    ipAddress: getClientIp(requestHeaders),
    rule,
  });
};
