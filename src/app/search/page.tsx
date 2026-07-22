import { MultiSearchPage } from 'lib/pages/search/multi';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Search movies and TV shows | TVSync',
  description:
    'Search TMDB for movies and TV shows, open detail pages, and save titles to your TVSync watchlist.',
  openGraph: {
    title: 'Search movies and TV shows | TVSync',
    description:
      'Search TMDB for movies and TV shows, open detail pages, and save titles to your TVSync watchlist.',
    url: '/search',
  },
};

const SearchPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/search' as Route);
  }

  return (
    <Suspense>
      <MultiSearchPage />
    </Suspense>
  );
};

export default SearchPage;
