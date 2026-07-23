import { ProfileAccessIssue } from 'lib/pages/profile';
import { EditProfilePage } from 'lib/pages/profile/edit';
import { getAuthSession } from 'lib/services/auth/session.server';
import { getDatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import { getOwnAuthMethods } from 'lib/services/database/profile.server';
import { getOwnProfile } from 'lib/services/database/tracking.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Update your TvSync profile and account security.',
  title: 'TvSync | Edit Profile',
};

export default async function Page() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile/edit' as Route);
  }

  try {
    const [profile, authMethods] = await Promise.all([
      getOwnProfile(),
      getOwnAuthMethods(),
    ]);

    if (!profile) {
      return (
        <ProfileAccessIssue
          issue={{
            description: 'Your profile record could not be loaded.',
            title: 'Profile data is missing',
          }}
        />
      );
    }

    return <EditProfilePage authMethods={authMethods} profile={profile} />;
  } catch (error) {
    const issue = getDatabaseAvailabilityIssue(error);

    if (!issue) {
      throw error;
    }

    return <ProfileAccessIssue issue={issue} />;
  }
}
