import { MoviesPage } from 'lib/pages/movies';
import { loadOwnMovieLibraryItems } from 'lib/pages/movies/load-movie-library.server';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'TvSync | Your movies',
  description: 'Review and manage your personal movie library in TvSync.',
  openGraph: {
    title: 'TvSync | Your movies',
    description: 'Review and manage your personal movie library in TvSync.',
    url: '/movies',
  },
};

export default async function Page() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect('/login?callbackUrl=/movies' as Route);
  }

  const items = await loadOwnMovieLibraryItems();

  return <MoviesPage initialItems={items} />;
}
