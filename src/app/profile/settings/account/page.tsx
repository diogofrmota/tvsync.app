import { ProfileAccessIssue } from 'lib/pages/profile';
import { requireOwnProfile } from 'lib/pages/profile/route-guards.server';
import { SettingsAccountPage } from 'lib/pages/profile/settings-account';
import { getDatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import { getOwnAuthMethods } from 'lib/services/database/profile.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Manage your TvSync password and account deletion.',
  title: 'TvSync | Account Settings',
};

export default async function Page() {
  const profile = await requireOwnProfile('/profile/settings/account');

  try {
    const authMethods = await getOwnAuthMethods();

    return (
      <SettingsAccountPage
        authMethods={authMethods}
        username={profile.username}
      />
    );
  } catch (error) {
    const issue = getDatabaseAvailabilityIssue(error);

    if (!issue) {
      throw error;
    }

    return <ProfileAccessIssue issue={issue} />;
  }
}
