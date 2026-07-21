import { MultiSearchPage } from 'lib/pages/search/multi';
import type { Metadata } from 'next';
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

const SearchPage = () => {
  return (
    <Suspense>
      <MultiSearchPage />
    </Suspense>
  );
};

export default SearchPage;
