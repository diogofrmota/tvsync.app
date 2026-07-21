import 'server-only';

import { type NeonQueryFunction, neon } from '@neondatabase/serverless';

export type DatabaseSql = NeonQueryFunction<false, false>;

let databaseSql: DatabaseSql | null = null;

export type DatabaseAvailabilityIssue = {
  description: string;
  title: string;
};

const getRequiredDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'Missing DATABASE_URL. Add the Neon pooled connection string to local .env.local and Vercel environment variables.'
    );
  }

  return databaseUrl;
};

export const isMissingDatabaseUrlError = (error: unknown) =>
  error instanceof Error && error.message.startsWith('Missing DATABASE_URL.');

const getDatabaseErrorCode = (error: unknown) => {
  if (!(error && typeof error === 'object' && 'code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' ? code : null;
};

const getDatabaseErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message.toLowerCase()
    : String(error).toLowerCase();

export const getDatabaseAvailabilityIssue = (
  error: unknown
): DatabaseAvailabilityIssue | null => {
  if (isMissingDatabaseUrlError(error)) {
    return {
      description:
        'DATABASE_URL is not configured. Add the pooled Neon connection string to Vercel and local .env files before using profile, watchlist, or tracking features.',
      title: 'Profile storage is not configured',
    };
  }

  const code = getDatabaseErrorCode(error);
  const message = getDatabaseErrorMessage(error);

  if (
    code === '42P01' ||
    message.includes('relation "profiles" does not exist')
  ) {
    return {
      description:
        'The Neon database is reachable, but the tracking schema has not been applied. Run the SQL migrations in database/migrations against DATABASE_URL_UNPOOLED.',
      title: 'Profile database schema is missing',
    };
  }

  if (
    code === '42703' ||
    message.includes('column') ||
    message.includes('does not exist')
  ) {
    return {
      description:
        'The Neon database schema does not match the app code. Apply all pending SQL migrations from database/migrations in numeric order.',
      title: 'Profile database schema is out of date',
    };
  }

  if (
    ['08000', '08001', '08003', '08006', '28P01', '3D000', '42501'].includes(
      code ?? ''
    ) ||
    message.includes('fetch failed') ||
    message.includes('connection') ||
    message.includes('connect') ||
    message.includes('timeout') ||
    message.includes('enotfound') ||
    message.includes('permission denied')
  ) {
    return {
      description:
        'TVSync could not connect to Neon with the configured DATABASE_URL. Check that Vercel has the pooled Neon runtime URL for the production environment.',
      title: 'Profile database connection failed',
    };
  }

  return null;
};

export const getDatabaseSql = () => {
  if (!databaseSql) {
    databaseSql = neon(getRequiredDatabaseUrl());
  }

  return databaseSql;
};
