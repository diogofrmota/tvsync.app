import type { Route } from 'next';
import { permanentRedirect } from 'next/navigation';

/**
 * Profile editing moved into the settings sub-pages, where each entry has a
 * page of its own. The old route stays as a redirect so existing links (and
 * the Google reauthentication callback) keep working.
 */
export default function Page() {
  permanentRedirect('/profile/settings/profile' as Route);
}
