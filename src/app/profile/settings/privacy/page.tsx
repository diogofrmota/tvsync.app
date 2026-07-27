import { SettingsPrivacyPage } from 'lib/pages/profile/settings-privacy';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Review your TvSync privacy choices and download your data.',
  title: 'TvSync | Privacy Settings',
};

export default async function Page() {
  if (!(await getAuthSession())?.user?.id) {
    redirect('/login?callbackUrl=/profile/settings/privacy' as Route);
  }

  return <SettingsPrivacyPage />;
}
