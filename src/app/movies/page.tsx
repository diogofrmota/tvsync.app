import { MoviesPage } from 'lib/pages/movies';
import { loadOwnMovieLibraryItems } from 'lib/pages/movies/load-movie-library.server';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

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
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/movies' as Route);
  }

  const items = await loadOwnMovieLibraryItems();

  return <MoviesPage initialItems={items} />;
}
