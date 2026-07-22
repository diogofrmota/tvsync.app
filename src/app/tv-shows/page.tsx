import { TvShowsPage } from 'lib/pages/tv-shows';
import { loadOwnTvLibraryItems } from 'lib/pages/tv-shows/load-tv-library.server';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Your TV shows | TVSync',
  description: 'Review and manage your personal TV show watchlist in TVSync.',
  openGraph: {
    title: 'Your TV shows | TVSync',
    description: 'Review and manage your personal TV show watchlist in TVSync.',
    url: '/tv-shows',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/tv-shows' as Route);
  }

  const items = await loadOwnTvLibraryItems();

  return <TvShowsPage initialItems={items} />;
}
