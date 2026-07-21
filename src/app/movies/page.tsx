import { WatchlistPage } from 'lib/pages/watchlist';
import { loadOwnWatchlistPageItems } from 'lib/pages/watchlist/load-watchlist-items.server';
import { authOptions } from 'lib/services/auth/index.server';
import { MediaType } from 'lib/types';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Your movies | TVSync',
  description: 'Review and manage your personal movie watchlist in TVSync.',
  openGraph: {
    title: 'Your movies | TVSync',
    description: 'Review and manage your personal movie watchlist in TVSync.',
    url: '/movies',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/movies' as Route);
  }

  const items = await loadOwnWatchlistPageItems();

  return (
    <WatchlistPage
      emptyDescription="Search TMDB and add movies to build your movie watchlist."
      fixedMediaType={MediaType.Movie}
      items={items}
      subtitle="Your saved movies, organized by watch status."
      title="Movies"
    />
  );
}
