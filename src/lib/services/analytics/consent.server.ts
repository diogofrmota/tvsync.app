import 'server-only';

import { getAuthSession } from 'lib/services/auth/session.server';
import { getOwnPrivacyPreferences } from 'lib/services/database/privacy.server';
import { headers } from 'next/headers';

/**
 * Whether this request may load the analytics script.
 *
 * Two signals can withhold it, and either one is enough:
 *
 * - Global Privacy Control (`Sec-GPC: 1`), the browser-level opt-out signal
 *   California treats as a valid CCPA opt-out request. It is honoured for every
 *   visitor, signed in or not, with no account needed.
 * - The signed-in account's own analytics opt-out, which is the GDPR Art. 21
 *   objection saved from Edit Profile and follows the user across devices.
 *
 * A database that cannot be read never turns analytics back on: the failure
 * path withholds the script rather than assuming consent.
 */
export const isAnalyticsAllowed = async () => {
  const requestHeaders = await headers();

  if (requestHeaders.get('sec-gpc') === '1') {
    return false;
  }

  const session = await getAuthSession();

  if (!session?.user?.id) {
    return true;
  }

  try {
    const preferences = await getOwnPrivacyPreferences();

    return !preferences.analyticsOptOut;
  } catch {
    return false;
  }
};
