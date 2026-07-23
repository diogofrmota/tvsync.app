import 'server-only';

import { getPublicProfileStatistics } from 'lib/features/profile/profile-statistics.server';
import { ProfileConnectionsPage } from 'lib/pages/profile/connections';
import { getAuthSession } from 'lib/services/auth/session.server';
import { listProfileConnections } from 'lib/services/database/social.server';
import { notFound } from 'next/navigation';

export const loadProfileConnectionsPage = async (input: {
  kind: 'followers' | 'following';
  compare?: boolean;
  page?: number;
  search: string;
  username: string;
}) => {
  const [data, session] = await Promise.all([
    listProfileConnections(input),
    getAuthSession(),
  ]);

  if (!data) {
    notFound();
  }

  const comparisonEntries =
    input.compare && input.kind === 'following'
      ? await Promise.all(
          data.items
            .slice(0, 20)
            .map(
              async (item) =>
                [
                  item.username,
                  await getPublicProfileStatistics(item.username),
                ] as const
            )
        )
      : [];

  return (
    <ProfileConnectionsPage
      comparisons={Object.fromEntries(comparisonEntries)}
      data={data}
      isAuthenticated={Boolean(session?.user)}
      kind={input.kind}
      search={input.search}
      showComparisons={Boolean(input.compare)}
    />
  );
};
