import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  createAuthToken,
  digestAuthToken,
  getAuthTokenExpiry,
  normalizeEmail,
  normalizeLoginIdentifier,
  normalizeUsername,
} from 'lib/services/auth/security';

import {
  CONSUME_AUTH_RATE_LIMIT_QUERY,
  CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY,
  FIND_CREDENTIAL_ACCOUNT_QUERY,
  FIND_GOOGLE_ACCOUNT_USER_ID_QUERY,
  FIND_PROFILE_USER_ID_BY_EMAIL_QUERY,
  GET_SESSION_VERSION_QUERY,
  INSERT_EMAIL_VERIFICATION_TOKEN_QUERY,
  INSERT_PASSWORD_RESET_TOKEN_QUERY,
  INVALIDATE_EMAIL_VERIFICATION_TOKENS_QUERY,
  INVALIDATE_PASSWORD_RESET_TOKENS_QUERY,
  IS_PASSWORD_RESET_TOKEN_VALID_QUERY,
  LINK_GOOGLE_ACCOUNT_QUERY,
  RESET_PASSWORD_WITH_TOKEN_QUERY,
} from './auth-queries';
import { getDatabaseSql } from './core.server';

type GoogleIdentityInput = {
  email: string;
  name?: string | null;
  providerAccountId: string;
};

type CredentialAccountRow = {
  email: string;
  email_verified_at: Date | string | null;
  name: string;
  password_hash: string;
  session_version: number;
  user_id: string;
  username: string;
};

type AuthEmailRecipient = {
  email: string;
  token: string;
  username: string;
};

export class AuthAccountConflictError extends Error {
  constructor() {
    super('The provider identity conflicts with an existing account mapping.');
    this.name = 'AuthAccountConflictError';
  }
}

export class CredentialRegistrationError extends Error {
  field: 'email' | 'username';

  constructor(field: 'email' | 'username') {
    super(`A credentials account already uses this ${field}.`);
    this.field = field;
    this.name = 'CredentialRegistrationError';
  }
}

const normalizeProfileText = (value: string | null | undefined) =>
  value?.normalize('NFKC').trim().slice(0, 80) || 'TvSync User';

const createUsername = ({
  email,
  name,
  userId,
}: {
  email: string;
  name?: string | null;
  userId: string;
}) => {
  const preferredName = email.split('@').at(0) ?? name ?? 'tvsync';
  const normalizedName = normalizeUsername(preferredName)
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 15);
  const suffix = userId.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 8);

  return `${normalizedName || 'tvsync'}_${suffix || 'user'}`;
};

const isConstraintError = (error: unknown, constraint: string) =>
  String(error).includes(constraint);

export const registerCredentialAccount = async (input: {
  email: string;
  passwordHash: string;
  username: string;
}): Promise<AuthEmailRecipient> => {
  const sql = getDatabaseSql();
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const userId = randomUUID();
  const token = createAuthToken();
  const tokenDigest = digestAuthToken(token);
  const expiresAt = getAuthTokenExpiry();

  try {
    await sql.transaction((tx) => [
      tx`
        insert into profiles (
          user_id,
          name,
          username,
          display_name,
          email,
          privacy_setting,
          email_verified_at
        )
        values (
          ${userId},
          ${username},
          ${username},
          ${username},
          ${email},
          'private',
          null
        )
      `,
      tx`
        insert into auth_accounts (
          user_id,
          provider,
          provider_account_id,
          password_hash,
          password_updated_at
        )
        values (${userId}, 'credentials', ${userId}, ${input.passwordHash}, now())
      `,
      tx`
        insert into auth_email_verification_tokens (
          user_id,
          token_digest,
          expires_at
        )
        values (${userId}, ${tokenDigest}, ${expiresAt})
      `,
    ]);
  } catch (error) {
    if (
      isConstraintError(error, 'profiles_email_lower_unique') ||
      isConstraintError(error, 'profiles_email_normalized_unique')
    ) {
      throw new CredentialRegistrationError('email');
    }

    if (
      isConstraintError(error, 'profiles_username_lower_unique') ||
      isConstraintError(error, 'profiles_username_normalized_unique')
    ) {
      throw new CredentialRegistrationError('username');
    }

    throw error;
  }

  return { email, token, username };
};

export const findCredentialAccount = async (
  identifier: string
): Promise<CredentialAccountRow | null> => {
  const sql = getDatabaseSql();
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);
  const rows = (await sql.query(FIND_CREDENTIAL_ACCOUNT_QUERY, [
    normalizedIdentifier,
  ])) as Array<CredentialAccountRow>;

  return rows.at(0) ?? null;
};

const findGoogleAccountUserId = async (providerAccountId: string) => {
  const sql = getDatabaseSql();
  const rows = (await sql.query(FIND_GOOGLE_ACCOUNT_USER_ID_QUERY, [
    providerAccountId,
  ])) as Array<{ user_id: string }>;

  return rows.at(0)?.user_id ?? null;
};

const findProfileUserIdByEmail = async (email: string) => {
  const sql = getDatabaseSql();
  const rows = (await sql.query(FIND_PROFILE_USER_ID_BY_EMAIL_QUERY, [
    email,
  ])) as Array<{ user_id: string }>;

  return rows.at(0)?.user_id ?? null;
};

const updateGoogleProfile = async (input: {
  email: string;
  name: string;
  userId: string;
}) => {
  const sql = getDatabaseSql();
  await sql`
    update profiles
    set
      name = ${input.name},
      display_name = case
        when display_name = '' then ${input.name}
        else display_name
      end,
      email = ${input.email},
      email_verified_at = coalesce(email_verified_at, now()),
      updated_at = now()
    where user_id = ${input.userId}
  `;
};

const linkGoogleAccount = async (userId: string, providerAccountId: string) => {
  const sql = getDatabaseSql();

  try {
    await sql.query(LINK_GOOGLE_ACCOUNT_QUERY, [userId, providerAccountId]);
  } catch (error) {
    if (
      isConstraintError(error, 'auth_accounts_user_provider_unique') ||
      isConstraintError(error, 'auth_accounts_provider_account_unique')
    ) {
      throw new AuthAccountConflictError();
    }

    throw error;
  }

  const mappedUserId = await findGoogleAccountUserId(providerAccountId);

  if (mappedUserId !== userId) {
    throw new AuthAccountConflictError();
  }
};

export const ensureGoogleAuthIdentity = async (input: GoogleIdentityInput) => {
  const sql = getDatabaseSql();
  const email = normalizeEmail(input.email);
  const name = normalizeProfileText(input.name);
  const mappedUserId = await findGoogleAccountUserId(input.providerAccountId);
  const emailUserId = await findProfileUserIdByEmail(email);

  if (mappedUserId) {
    if (emailUserId && emailUserId !== mappedUserId) {
      throw new AuthAccountConflictError();
    }

    await updateGoogleProfile({ email, name, userId: mappedUserId });
    return mappedUserId;
  }

  if (emailUserId) {
    await linkGoogleAccount(emailUserId, input.providerAccountId);
    await updateGoogleProfile({ email, name, userId: emailUserId });
    return emailUserId;
  }

  const userId = randomUUID();
  const username = createUsername({ email, name, userId });

  try {
    await sql.transaction((tx) => [
      tx`
        insert into profiles (
          user_id,
          name,
          username,
          display_name,
          email,
          privacy_setting,
          email_verified_at
        )
        values (
          ${userId},
          ${name},
          ${username},
          ${name},
          ${email},
          'private',
          now()
        )
      `,
      tx`
        insert into auth_accounts (user_id, provider, provider_account_id)
        values (${userId}, 'google', ${input.providerAccountId})
      `,
    ]);
  } catch (error) {
    if (
      isConstraintError(error, 'profiles_email_lower_unique') ||
      isConstraintError(error, 'profiles_email_normalized_unique') ||
      isConstraintError(error, 'auth_accounts_provider_account_unique')
    ) {
      const concurrentMappedUserId = await findGoogleAccountUserId(
        input.providerAccountId
      );
      const concurrentEmailUserId = await findProfileUserIdByEmail(email);
      const resolvedUserId = concurrentMappedUserId ?? concurrentEmailUserId;

      if (resolvedUserId) {
        await linkGoogleAccount(resolvedUserId, input.providerAccountId);
        await updateGoogleProfile({ email, name, userId: resolvedUserId });
        return resolvedUserId;
      }
    }

    throw error;
  }

  return userId;
};

export const createEmailVerificationToken = async (
  identifier: string
): Promise<AuthEmailRecipient | null> => {
  const account = await findCredentialAccount(identifier);

  if (!account || account.email_verified_at) {
    return null;
  }

  const sql = getDatabaseSql();
  const token = createAuthToken();
  const tokenDigest = digestAuthToken(token);
  const expiresAt = getAuthTokenExpiry();

  await sql.transaction((tx) => [
    tx.query(INVALIDATE_EMAIL_VERIFICATION_TOKENS_QUERY, [account.user_id]),
    tx.query(INSERT_EMAIL_VERIFICATION_TOKEN_QUERY, [
      account.user_id,
      tokenDigest,
      expiresAt,
    ]),
  ]);

  return {
    email: account.email,
    token,
    username: account.username,
  };
};

export const consumeEmailVerificationToken = async (token: string) => {
  const sql = getDatabaseSql();
  const tokenDigest = digestAuthToken(token);
  const rows = (await sql.query(CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY, [
    tokenDigest,
  ])) as Array<{ user_id: string }>;

  return Boolean(rows.at(0));
};

export const createPasswordResetToken = async (
  emailInput: string
): Promise<AuthEmailRecipient | null> => {
  const email = normalizeEmail(emailInput);
  const account = await findCredentialAccount(email);

  if (!account || account.email !== email) {
    return null;
  }

  const sql = getDatabaseSql();
  const token = createAuthToken();
  const tokenDigest = digestAuthToken(token);
  const expiresAt = getAuthTokenExpiry();

  await sql.transaction((tx) => [
    tx.query(INVALIDATE_PASSWORD_RESET_TOKENS_QUERY, [account.user_id]),
    tx.query(INSERT_PASSWORD_RESET_TOKEN_QUERY, [
      account.user_id,
      tokenDigest,
      expiresAt,
    ]),
  ]);

  return { email, token, username: account.username };
};

export const isPasswordResetTokenValid = async (token: string) => {
  if (!token) {
    return false;
  }

  const sql = getDatabaseSql();
  const tokenDigest = digestAuthToken(token);
  const rows = (await sql.query(IS_PASSWORD_RESET_TOKEN_VALID_QUERY, [
    tokenDigest,
  ])) as Array<{ id: string }>;

  return Boolean(rows.at(0));
};

export const resetPasswordWithToken = async (
  token: string,
  passwordHash: string
) => {
  const sql = getDatabaseSql();
  const tokenDigest = digestAuthToken(token);
  const rows = (await sql.query(RESET_PASSWORD_WITH_TOKEN_QUERY, [
    tokenDigest,
    passwordHash,
  ])) as Array<{ user_id: string }>;

  return Boolean(rows.at(0));
};

export const getSessionVersion = async (userId: string) => {
  const sql = getDatabaseSql();
  const rows = (await sql.query(GET_SESSION_VERSION_QUERY, [userId])) as Array<{
    session_version: number;
  }>;

  return rows.at(0)?.session_version ?? null;
};

export const consumeAuthRateLimit = async (input: {
  keyDigest: string;
  limit: number;
  scope: string;
  windowSeconds: number;
}) => {
  const sql = getDatabaseSql();
  const rows = (await sql.query(CONSUME_AUTH_RATE_LIMIT_QUERY, [
    input.scope,
    input.keyDigest,
    input.windowSeconds,
  ])) as Array<{ attempt_count: number }>;

  return (rows.at(0)?.attempt_count ?? input.limit + 1) <= input.limit;
};
