import { WatchlistPage } from 'lib/pages/watchlist';
import { loadOwnWatchlistPageItems } from 'lib/pages/watchlist/load-watchlist-items.server';
import { authOptions } from 'lib/services/auth/index.server';
import { MediaType } from 'lib/types';
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

  const items = await loadOwnWatchlistPageItems();

  return (
    <WatchlistPage
      emptyDescription="Search TMDB and add TV shows to build your TV show watchlist."
      fixedMediaType={MediaType.Tv}
      items={items}
      subtitle="Your saved TV shows, organized by watch status."
      title="TV Shows"
    />
  );
}
