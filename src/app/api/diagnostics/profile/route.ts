import { getAuthSession } from 'lib/services/auth/session.server';
import { getAuthSessionIssue } from 'lib/services/auth/session-error.server';
import {
  getDatabaseAvailabilityIssue,
  getDatabaseSql,
} from 'lib/services/database/core.server';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

export const dynamic = 'force-dynamic';

const getOrigin = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return 'invalid-url';
  }
};

const getErrorCode = (error: unknown) => {
  if (!(error && typeof error === 'object' && 'code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' ? code : null;
};

const getEnvironmentDiagnostics = () => ({
  authSecretConfigured: Boolean(process.env.AUTH_SECRET),
  authUrlOrigin: getOrigin(process.env.AUTH_URL),
  databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
  googleClientConfigured: Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ),
  nextAuthUrlOrigin: getOrigin(process.env.NEXTAUTH_URL),
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV ?? null,
});

export async function GET() {
  let session: Session | null = null;

  try {
    session = await getAuthSession();
  } catch (error) {
    return NextResponse.json({
      auth: {
        hasEmail: false,
        hasSession: false,
        hasUserId: false,
        issue: getAuthSessionIssue(error),
        sessionReadable: false,
        userIdSuffix: null,
      },
      checkedAt: new Date().toISOString(),
      database: {
        checked: false,
        reason: 'The auth session could not be read.',
      },
    });
  }

  const userId = session?.user?.id;

  const baseDiagnostics = {
    auth: {
      hasEmail: Boolean(session?.user?.email),
      hasSession: Boolean(session?.user),
      hasUserId: Boolean(userId),
      issue: null,
      sessionReadable: true,
      userIdSuffix: userId ? userId.slice(-6) : null,
    },
    checkedAt: new Date().toISOString(),
  };

  if (!(session?.user && userId)) {
    return NextResponse.json(
      {
        ...baseDiagnostics,
        database: {
          checked: false,
          reason: 'Sign in before running the profile database diagnostic.',
        },
      },
      { status: 401 }
    );
  }

  const authenticatedDiagnostics = {
    ...baseDiagnostics,
    environment: getEnvironmentDiagnostics(),
  };

  try {
    const sql = getDatabaseSql();
    const rows = (await sql`
      select user_id, username
      from profiles
      where user_id = ${userId}
      limit 1
    `) as Array<{ user_id: string; username: string }>;
    const profile = rows.at(0);

    return NextResponse.json({
      ...authenticatedDiagnostics,
      database: {
        checked: true,
        issue: null,
        profileFound: Boolean(profile),
        status: 'ok',
        username: profile?.username ?? null,
      },
    });
  } catch (error) {
    const issue = getDatabaseAvailabilityIssue(error);

    return NextResponse.json(
      {
        ...authenticatedDiagnostics,
        database: {
          checked: true,
          errorCode: getErrorCode(error),
          issue,
          profileFound: false,
          status: 'error',
        },
      },
      { status: 200 }
    );
  }
}
