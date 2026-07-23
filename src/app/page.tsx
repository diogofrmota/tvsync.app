import { Home } from 'lib/pages/home';
import { loadHomeDiscoverySections } from 'lib/pages/home/load-home-discovery.server';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'TvSync | Movie and TV show tracker',
  description:
    'Discover trending movies and TV shows, search TMDB, and track what you plan to watch next.',
  openGraph: {
    title: 'TvSync | Movie and TV show tracker',
    description:
      'Discover trending movies and TV shows, search TMDB, and track what you plan to watch next.',
    url: '/',
  },
};

export default async function Page() {
  const session = await getAuthSession();
  const isAuthenticated = Boolean(session?.user?.id);
  if (isAuthenticated) {
    redirect('/movies' as Route);
  }

  return <Home discoverySections={await loadHomeDiscoverySections()} />;
}
