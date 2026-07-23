import 'server-only';

import { authOptions } from 'lib/services/auth/index.server';
import { getServerSession } from 'next-auth/next';
import { cache } from 'react';

/**
 * Memoized per-request: layouts, pages, and nested server components that
 * each need the session read the same underlying result once instead of
 * re-running the NextAuth jwt callback (and its session-version DB check)
 * on every call within the same request.
 */
export const getAuthSession = cache(() => getServerSession(authOptions));
