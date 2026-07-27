import { ProfileAccessIssue } from 'lib/pages/profile';
import { requireOwnProfile } from 'lib/pages/profile/route-guards.server';
import { SettingsProfilePage } from 'lib/pages/profile/settings-profile';
import { getDatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import { getOwnAuthMethods } from 'lib/services/database/profile.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Update your TvSync avatar, display name, username and bio.',
  title: 'TvSync | Profile Settings',
};

export default async function Page() {
  const profile = await requireOwnProfile('/profile/settings/profile');

  try {
    const authMethods = await getOwnAuthMethods();

    return (
      <SettingsProfilePage
        hasCredentials={authMethods.hasCredentials}
        profile={profile}
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
