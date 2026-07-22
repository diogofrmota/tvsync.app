import { WatchlistPage } from 'lib/pages/watchlist';
import { loadOwnWatchlistPageItems } from 'lib/pages/watchlist/load-watchlist-items.server';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Your watchlist | TvSync',
  description:
    'Review, search, sort, and manage your saved movies and TV shows in TvSync.',
  openGraph: {
    title: 'Your watchlist | TvSync',
    description:
      'Review, search, sort, and manage your saved movies and TV shows in TvSync.',
    url: '/watchlist',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/watchlist' as Route);
  }

  const items = await loadOwnWatchlistPageItems();

  return <WatchlistPage items={items} />;
}
