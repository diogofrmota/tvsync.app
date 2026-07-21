import {
  ProfileAccessIssue,
  ProfilePage,
  type ProfileTVStats,
} from 'lib/pages/profile';
import { authOptions } from 'lib/services/auth/index.server';
import {
  getAuthSessionIssue,
  getProfileAccessIssue,
} from 'lib/services/auth/session-error.server';
import {
  type DatabaseAvailabilityIssue,
  getDatabaseAvailabilityIssue,
} from 'lib/services/database/core.server';
import {
  getOwnProfile,
  listOwnMedia,
  type OwnProfile,
} from 'lib/services/database/tracking.server';
import { MediaType, WatchStatus } from 'lib/types';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Your profile | TVSync',
  description:
    'Manage your TVSync profile, generated avatar, username, display name, bio, and privacy setting.',
  openGraph: {
    title: 'Your profile | TVSync',
    description:
      'Manage your TVSync profile, generated avatar, username, display name, bio, and privacy setting.',
    url: '/profile',
  },
};

const emptyTVStats: ProfileTVStats = {
  completed: 0,
  dropped: 0,
  paused: 0,
  planned: 0,
  total: 0,
  watching: 0,
};

const getOwnTVStats = async (): Promise<ProfileTVStats> => {
  const rows = await listOwnMedia();
  const tvRows = rows.filter((row) => row.media_type === MediaType.Tv);

  return {
    completed: tvRows.filter(
      (row) => row.watch_status === WatchStatus.Completed
    ).length,
    dropped: tvRows.filter((row) => row.watch_status === WatchStatus.Dropped)
      .length,
    paused: tvRows.filter((row) => row.watch_status === WatchStatus.Paused)
      .length,
    planned: tvRows.filter((row) => row.watch_status === WatchStatus.Planned)
      .length,
    total: tvRows.length,
    watching: tvRows.filter((row) => row.watch_status === WatchStatus.Watching)
      .length,
  };
};

export default async function Page() {
  let session: Session | null = null;

  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    return <ProfileAccessIssue issue={getAuthSessionIssue(error)} />;
  }

  if (!session?.user) {
    redirect('/login?callbackUrl=/profile' as Route);
  }

  if (!session.user.id) {
    return (
      <ProfileAccessIssue
        issue={{
          description:
            'Your login session exists, but TVSync could not find the user id needed to load private profile data. Sign out, clear TVSync cookies if needed, and sign in again. If it keeps happening, check the NextAuth JWT/session callbacks and AUTH_SECRET in Vercel.',
          title: 'Profile access could not be authorized',
        }}
      />
    );
  }

  let databaseIssue: DatabaseAvailabilityIssue | null = null;
  let profile: OwnProfile | null = null;
  let tvStats: ProfileTVStats = emptyTVStats;

  try {
    [profile, tvStats] = await Promise.all([getOwnProfile(), getOwnTVStats()]);
  } catch (error) {
    const profileAccessIssue = getProfileAccessIssue(error);

    if (profileAccessIssue) {
      return <ProfileAccessIssue issue={profileAccessIssue} />;
    }

    databaseIssue = getDatabaseAvailabilityIssue(error);

    if (!databaseIssue) {
      throw error;
    }
  }

  return (
    <ProfilePage
      databaseIssue={databaseIssue}
      email={session.user.email}
      name={session.user.name}
      profile={profile}
      tvStats={tvStats}
    />
  );
}
