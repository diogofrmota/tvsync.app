import { SettingsIndexPage } from 'lib/pages/profile/settings';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'TvSync | Settings' };

export default async function SettingsPage() {
  if (!(await getAuthSession())?.user?.id) {
    redirect('/login?callbackUrl=/profile/settings' as Route);
  }

  return <SettingsIndexPage />;
}
