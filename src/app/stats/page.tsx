import { getUserStatsData } from 'lib/features/stats';
import { StatsPage } from 'lib/pages/stats';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Statistics | TVSync',
  description:
    'See your TVSync watching stats, ratings, reviews, genres, and tracking summary.',
  openGraph: {
    title: 'Statistics | TVSync',
    description:
      'See your TVSync watching stats, ratings, reviews, genres, and tracking summary.',
    url: '/stats',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/stats' as Route);
  }

  const data = await getUserStatsData();

  return <StatsPage data={data} />;
}
