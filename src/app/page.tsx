import { Home } from 'lib/pages/home';
import { loadHomeDiscoverySections } from 'lib/pages/home/load-home-discovery.server';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'TVSync | Movie and TV show tracker',
  description:
    'Discover trending movies and TV shows, search TMDB, and track what you plan to watch next.',
  openGraph: {
    title: 'TVSync | Movie and TV show tracker',
    description:
      'Discover trending movies and TV shows, search TMDB, and track what you plan to watch next.',
    url: '/',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user?.id);
  if (isAuthenticated) {
    redirect('/movies' as Route);
  }

  return <Home discoverySections={await loadHomeDiscoverySections()} />;
}
