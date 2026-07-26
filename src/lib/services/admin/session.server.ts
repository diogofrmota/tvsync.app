import 'server-only';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  type AdminSessionPayload,
  createAdminSessionToken,
  deriveAdminSessionKey,
  secretsMatch,
  verifyAdminSessionToken,
} from 'lib/services/admin/security';
import { getClientIp } from 'lib/services/auth/rate-limit.server';
import { digestRateLimitKey } from 'lib/services/auth/security';
import { cookies, headers } from 'next/headers';

type AdminCredentials = {
  password: string;
  user: string;
};

export class AdminAuthorizationError extends Error {
  constructor() {
    super('This action requires an authenticated admin session.');
    this.name = 'AdminAuthorizationError';
  }
}

/**
 * The dashboard exists only when both credentials are configured. Leaving
 * either one unset keeps `/admin` closed instead of falling back to a default
 * login, which is what makes an accidentally-unconfigured deployment safe.
 */
export const getAdminCredentials = (): AdminCredentials | null => {
  const user = process.env.ADMIN_USER?.trim();
  const password = process.env.ADMIN_PASSWORD;

  return user && password ? { password, user } : null;
};

export const isAdminConfigured = () =>
  Boolean(getAdminCredentials() && process.env.AUTH_SECRET);

const getSessionKey = (credentials: AdminCredentials) => {
  const secret = process.env.AUTH_SECRET;

  return secret
    ? deriveAdminSessionKey({
        password: credentials.password,
        secret,
        user: credentials.user,
      })
    : null;
};

export const verifyAdminCredentials = (input: {
  password: string;
  user: string;
}) => {
  const credentials = getAdminCredentials();

  if (!credentials) {
    return false;
  }

  // Both comparisons always run so a wrong username costs the same as a wrong
  // password.
  const userMatches = secretsMatch(input.user, credentials.user);
  const passwordMatches = secretsMatch(input.password, credentials.password);

  return userMatches && passwordMatches;
};

export const getAdminSession =
  async (): Promise<AdminSessionPayload | null> => {
    const credentials = getAdminCredentials();
    const key = credentials ? getSessionKey(credentials) : null;

    if (!(credentials && key)) {
      return null;
    }

    const cookieStore = await cookies();

    return verifyAdminSessionToken({
      expectedUser: credentials.user,
      key,
      token: cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    });
  };

/**
 * Every admin mutation calls this before touching data. The rendered page is
 * never treated as proof of authorization, so a stale tab cannot replay an
 * action after the cookie expires or the password is rotated.
 */
export const requireAdminSession = async (): Promise<AdminSessionPayload> => {
  const session = await getAdminSession();

  if (!session) {
    throw new AdminAuthorizationError();
  }

  return session;
};

export const startAdminSession = async (user: string) => {
  const credentials = getAdminCredentials();
  const key = credentials ? getSessionKey(credentials) : null;

  if (!key) {
    return false;
  }

  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_MS / 1000,
    name: ADMIN_SESSION_COOKIE,
    path: '/admin',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    value: createAdminSessionToken({ key, user }),
  });

  return true;
};

export const endAdminSession = async () => {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: 0,
    name: ADMIN_SESSION_COOKIE,
    path: '/admin',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    value: '',
  });
};

/**
 * The audit trail records where an action came from without storing a raw IP:
 * the same `AUTH_SECRET`-keyed digest the authentication throttles already use.
 */
export const getAdminRequestDigest = async () => {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return '';
  }

  const requestHeaders = await headers();

  return digestRateLimitKey(getClientIp(requestHeaders), secret);
};
