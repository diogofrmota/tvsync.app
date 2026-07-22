import { MoviesPage } from 'lib/pages/movies';
import { loadOwnMovieLibraryItems } from 'lib/pages/movies/load-movie-library.server';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Your movies | TVSync',
  description: 'Review and manage your personal movie library in TVSync.',
  openGraph: {
    title: 'Your movies | TVSync',
    description: 'Review and manage your personal movie library in TVSync.',
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
