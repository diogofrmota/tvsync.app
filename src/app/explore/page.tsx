import { ExploreDiscover } from 'lib/pages/explore/discover.server';
import { loadSearchLibraryState } from 'lib/pages/search/load-search-library-state.server';
import { MultiSearchPage } from 'lib/pages/search/multi';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'TvSync | Explore movies and TV shows',
  description:
    'Discover trending movies and TV shows, browse by genre, search TMDB, and save titles to your TvSync watchlist.',
  openGraph: {
    title: 'TvSync | Explore movies and TV shows',
    description:
      'Discover trending movies and TV shows, browse by genre, search TMDB, and save titles to your TvSync watchlist.',
    url: '/explore',
  },
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | Array<string> | undefined>>;
};

// A bare /explore visit shows the discovery landing (trending rails, genres,
// featured hero). Any active search/browse intent falls back to the results
// grid so search keeps behaving exactly as before.
const SEARCH_INTENT_KEYS = ['query', 'genre', 'type', 'sort', 'page'] as const;

const hasSearchIntent = (
  searchParams: Record<string, string | Array<string> | undefined>
) =>
  SEARCH_INTENT_KEYS.some((key) => {
    const rawValue = searchParams[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    return Boolean(value);
  });

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
  const resolvedSearchParams = await searchParams;
  const session = await getAuthSession();
  if (!session?.user) {
    const callbackUrl = getCallbackUrl(resolvedSearchParams);
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route);
  }

  if (!hasSearchIntent(resolvedSearchParams)) {
    return <ExploreDiscover />;
  }

  const initialLibraryItems = await loadSearchLibraryState();

  return (
    <Suspense>
      <MultiSearchPage initialLibraryItems={initialLibraryItems} />
    </Suspense>
  );
};

export default ExplorePage;
