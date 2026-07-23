import { loadSearchLibraryState } from 'lib/pages/search/load-search-library-state.server';
import { MultiSearchPage } from 'lib/pages/search/multi';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'TvSync | Explore movies and TV shows',
  description:
    'Search TMDB for movies and TV shows, open detail pages, and save titles to your TvSync watchlist.',
  openGraph: {
    title: 'TvSync | Explore movies and TV shows',
    description:
      'Search TMDB for movies and TV shows, open detail pages, and save titles to your TvSync watchlist.',
    url: '/explore',
  },
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | Array<string> | undefined>>;
};

const getCallbackUrl = (
  searchParams: Record<string, string | Array<string> | undefined>
) => {
  const callbackParams = new URLSearchParams();

  for (const key of ['type', 'query', 'genre', 'sort', 'page']) {
    const rawValue = searchParams[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value) {
      callbackParams.set(key, value);
    }
  }

  const queryString = callbackParams.toString();
  return queryString ? `/explore?${queryString}` : '/explore';
};

const ExplorePage = async ({ searchParams }: SearchPageProps) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = getCallbackUrl(await searchParams);
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route);
  }

  const initialLibraryItems = await loadSearchLibraryState();

  return (
    <Suspense>
      <MultiSearchPage initialLibraryItems={initialLibraryItems} />
    </Suspense>
  );
};

export default ExplorePage;
