import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The admin dashboard is credential-gated with `ADMIN_USER`/`ADMIN_PASSWORD`
 * rather than tied to a TvSync account, so its session is a stateless signed
 * cookie: no extra table, no per-request database read, and nothing to
 * replicate when the app runs in several regions at once.
 *
 * The signing key mixes `AUTH_SECRET` with a digest of the configured
 * credentials, so rotating either the password or the app secret invalidates
 * every issued admin cookie without any server-side bookkeeping.
 */
export const ADMIN_SESSION_COOKIE = 'tvsync_admin_session';
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const ADMIN_SESSION_VERSION = 1;
const SESSION_KEY_LABEL = 'tvsync-admin-session-key';

export type AdminSessionPayload = {
  /** Milliseconds since the epoch when this cookie stops being accepted. */
  expiresAt: number;
  issuedAt: number;
  user: string;
  version: number;
};

const encodeSegment = (value: string) =>
  Buffer.from(value, 'utf8').toString('base64url');

const decodeSegment = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

const sign = (value: string, key: string) =>
  createHmac('sha256', key).update(value).digest('base64url');

const digest = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest();

/**
 * Compares two secrets in constant time. Both sides are hashed first so the
 * comparison length never depends on the attempted value.
 */
export const secretsMatch = (attempt: string, expected: string) =>
  timingSafeEqual(digest(attempt), digest(expected));

export const deriveAdminSessionKey = (input: {
  password: string;
  secret: string;
  user: string;
}) =>
  createHmac('sha256', input.secret)
    .update(
      `${SESSION_KEY_LABEL}:${createHash('sha256')
        .update(`${input.user}:${input.password}`, 'utf8')
        .digest('hex')}`
    )
    .digest('hex');

export const createAdminSessionToken = (input: {
  key: string;
  now?: number;
  user: string;
}) => {
  const issuedAt = input.now ?? Date.now();
  const payload: AdminSessionPayload = {
    expiresAt: issuedAt + ADMIN_SESSION_TTL_MS,
    issuedAt,
    user: input.user,
    version: ADMIN_SESSION_VERSION,
  };
  const encodedPayload = encodeSegment(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload, input.key)}`;
};

const parsePayload = (encodedPayload: string): AdminSessionPayload | null => {
  try {
    const parsed: unknown = JSON.parse(decodeSegment(encodedPayload));

    if (!(parsed && typeof parsed === 'object')) {
      return null;
    }

    const candidate = parsed as Partial<AdminSessionPayload>;

    if (
      candidate.version !== ADMIN_SESSION_VERSION ||
      typeof candidate.user !== 'string' ||
      !(
        Number.isFinite(candidate.expiresAt) &&
        Number.isFinite(candidate.issuedAt)
      )
    ) {
      return null;
    }

    return {
      expiresAt: candidate.expiresAt as number,
      issuedAt: candidate.issuedAt as number,
      user: candidate.user,
      version: ADMIN_SESSION_VERSION,
    };
  } catch {
    return null;
  }
};

/**
 * Returns the session only when the cookie is intact, signed with the current
 * key, still inside its lifetime, and issued for the configured admin user.
 */
export const verifyAdminSessionToken = (input: {
  expectedUser: string;
  key: string;
  now?: number;
  token: string | undefined;
}): AdminSessionPayload | null => {
  const [encodedPayload, signature] = (input.token ?? '').split('.');

  if (!(encodedPayload && signature)) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, input.key);

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )
  ) {
    return null;
  }

  const payload = parsePayload(encodedPayload);
  const now = input.now ?? Date.now();

  if (
    !payload ||
    payload.user !== input.expectedUser ||
    payload.expiresAt <= now ||
    payload.issuedAt > now + 60_000
  ) {
    return null;
  }

  return payload;
};
