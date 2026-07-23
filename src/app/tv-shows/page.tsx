import { TvShowsPage } from 'lib/pages/tv-shows';
import { loadOwnTvLibraryItems } from 'lib/pages/tv-shows/load-tv-library.server';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'TvSync | Your TV shows',
  description: 'Review and manage your personal TV show watchlist in TvSync.',
  openGraph: {
    title: 'TvSync | Your TV shows',
    description: 'Review and manage your personal TV show watchlist in TvSync.',
    url: '/tv-shows',
  },
};

export default async function Page() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect('/login?callbackUrl=/tv-shows' as Route);
  }

  const items = await loadOwnTvLibraryItems();

  return <TvShowsPage initialItems={items} />;
}
