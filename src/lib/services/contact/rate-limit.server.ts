import 'server-only';

import { createHash } from 'node:crypto';
import { getClientIp } from 'lib/services/auth/rate-limit.server';
import { consumeAuthRateLimit } from 'lib/services/database/auth.server';
import { headers } from 'next/headers';

// Reuses the existing generic, scope-keyed `auth_rate_limits` Neon table
// (see database/migrations/0005_auth_lifecycle.sql) instead of adding a
// dedicated contact-only table.
const CONTACT_SUBMIT_LIMIT = { limit: 5, windowSeconds: 60 * 60 } as const;
const CONTACT_DEDUPE_WINDOW_SECONDS = 10 * 60;

const digestContactKey = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export const checkContactRateLimit = async (email: string) => {
  const requestHeaders = await headers();
  const ipAddress = getClientIp(requestHeaders);

  const [identityAllowed, ipAllowed] = await Promise.all([
    consumeAuthRateLimit({
      keyDigest: digestContactKey(`identity:${email}`),
      limit: CONTACT_SUBMIT_LIMIT.limit,
      scope: 'contact:identity',
      windowSeconds: CONTACT_SUBMIT_LIMIT.windowSeconds,
    }),
    consumeAuthRateLimit({
      keyDigest: digestContactKey(`ip:${ipAddress}`),
      limit: CONTACT_SUBMIT_LIMIT.limit * 3,
      scope: 'contact:ip',
      windowSeconds: CONTACT_SUBMIT_LIMIT.windowSeconds,
    }),
  ]);

  return identityAllowed && ipAllowed;
};

export const isDuplicateContactSubmission = async (input: {
  email: string;
  message: string;
  subject: string;
}) => {
  const dedupeKeyDigest = digestContactKey(
    `dedupe:${input.email}:${input.subject}:${input.message}`
  );
  const isFirstSubmission = await consumeAuthRateLimit({
    keyDigest: dedupeKeyDigest,
    limit: 1,
    scope: 'contact:dedupe',
    windowSeconds: CONTACT_DEDUPE_WINDOW_SECONDS,
  });

  return !isFirstSubmission;
};
