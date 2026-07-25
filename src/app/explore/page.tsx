import { ExploreDiscover } from 'lib/pages/explore/discover.server';
import { loadSearchLibraryState } from 'lib/pages/search/load-search-library-state.server';
import { SearchResultsPage } from 'lib/pages/search/results';
import { getSearchQuery } from 'lib/pages/search/search-state';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'TvSync | Explore movies and TV shows',
  description:
    'Discover trending movies and TV shows, search TMDB, and save titles to your TvSync watchlist.',
  openGraph: {
    title: 'TvSync | Explore movies and TV shows',
    description:
      'Discover trending movies and TV shows, search TMDB, and save titles to your TvSync watchlist.',
    url: '/explore',
  },
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | Array<string> | undefined>>;
};

const firstValue = (value: string | Array<string> | undefined) =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

// A bare /explore visit shows the discovery landing (featured hero plus the
// trending and popular rails). A search term replaces it with the single
// popularity-ordered result list.
const getQuery = (
  searchParams: Record<string, string | Array<string> | undefined>
) => getSearchQuery(firstValue(searchParams.query));

const getCallbackUrl = (query: string) =>
  query ? `/explore?query=${encodeURIComponent(query)}` : '/explore';

const ExplorePage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams;
  const query = getQuery(resolvedSearchParams);
  const session = await getAuthSession();

  if (!session?.user) {
    const callbackUrl = getCallbackUrl(query);
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route);
  }

  if (!query) {
    return <ExploreDiscover />;
  }

  const initialLibraryItems = await loadSearchLibraryState();

  return (
    <Suspense>
      <SearchResultsPage initialLibraryItems={initialLibraryItems} />
    </Suspense>
  );
};

export default ExplorePage;
