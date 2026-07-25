import 'server-only';

import { getAuthSession } from 'lib/services/auth/session.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import { getOwnProfile } from 'lib/services/database/tracking.server';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * Shared guard for the profile sub-routes (statistics and favourites).
 * Signed-out visitors go to login and come back to the page they asked for;
 * anything else that stops the profile from loading falls back to `/profile`,
 * which already renders the friendly access panels.
 */
export const requireOwnProfile = async (
  callbackPath: string
): Promise<OwnProfile> => {
  const session = await getAuthSession().catch(() => null);

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}` as Route);
  }

  const profile = await getOwnProfile().catch(() => null);

  if (!profile) {
    redirect('/profile' as Route);
  }

  return profile;
};
