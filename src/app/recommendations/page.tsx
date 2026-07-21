import { getReceivedRecommendationsData } from 'lib/features/social';
import { RecommendationsPage } from 'lib/pages/recommendations';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Recommendations | TVSync',
  description:
    'Review movie and TV show recommendations sent by people you follow on TVSync.',
  openGraph: {
    title: 'Recommendations | TVSync',
    description:
      'Review movie and TV show recommendations sent by people you follow on TVSync.',
    url: '/recommendations',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/recommendations' as Route);
  }

  const items = await getReceivedRecommendationsData();

  return <RecommendationsPage items={items} />;
}
