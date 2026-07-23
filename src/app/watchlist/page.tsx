import { WatchlistPage } from 'lib/pages/watchlist';
import { loadOwnWatchlistPageItems } from 'lib/pages/watchlist/load-watchlist-items.server';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'TvSync | Your watchlist',
  description:
    'Review, search, sort, and manage your saved movies and TV shows in TvSync.',
  openGraph: {
    title: 'TvSync | Your watchlist',
    description:
      'Review, search, sort, and manage your saved movies and TV shows in TvSync.',
    url: '/watchlist',
  },
};

export default async function Page() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect('/login?callbackUrl=/watchlist' as Route);
  }

  const items = await loadOwnWatchlistPageItems();

  return <WatchlistPage items={items} />;
}
