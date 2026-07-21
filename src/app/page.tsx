import { getDashboardData } from 'lib/features/dashboard';
import { Home, type HomeDiscoverySection } from 'lib/pages/home';
import {
  mapMovieOverviewItem,
  mapTVShowOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import { authOptions } from 'lib/services/auth/index.server';
import { getMovieListServer } from 'lib/services/tmdb/movie/list/index.server';
import type { MovieListParams } from 'lib/services/tmdb/movie/list/types';
import { getDiscoverTVShowsServer } from 'lib/services/tmdb/tv/list/index.server';
import type { TVShowListParams } from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import type { Metadata, Route } from 'next';
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

const getSectionState = async <Data,>(request: Promise<Data>) => {
  const result = await Promise.resolve(request).then(
    (data) => ({ data, error: undefined }),
    (error: unknown) => ({
      data: undefined,
      error:
        error instanceof Error ? error.message : 'Unable to load TMDB data.',
    })
  );

  return result;
};

const popularMovieParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6',
  'vote_count.gte': '1000',
} satisfies MovieListParams;

const topRatedMovieParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '10000',
} satisfies MovieListParams;

const popularTVParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6',
  'vote_count.gte': '500',
} satisfies TVShowListParams;

const topRatedTVParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '1500',
} satisfies TVShowListParams;

const buildHref = (path: string, params: Record<string, string>) => {
  const searchParams = new URLSearchParams({ ...params, page: '1' });

  return `${path}?${searchParams.toString()}` as Route;
};

const loadDiscoverySections = async (): Promise<
  Array<HomeDiscoverySection>
> => {
  const [popularMovies, topRatedMovies, popularTV, topRatedTV] =
    await Promise.all([
      getMovieListServer({
        params: { page: 1, ...popularMovieParams },
        section: 'popular',
      }),
      getMovieListServer({
        params: { page: 1, ...topRatedMovieParams },
        section: 'top_rated',
      }),
      getDiscoverTVShowsServer({ page: 1, ...popularTVParams }),
      getDiscoverTVShowsServer({ page: 1, ...topRatedTVParams }),
    ]);

  return [
    {
      items: uniqueMediaOverviewItems(
        popularMovies.results.map(mapMovieOverviewItem)
      ),
      mediaType: MediaType.Movie,
      seeAllHref: buildHref(
        '/movies/popular',
        popularMovieParams as Record<string, string>
      ),
      title: 'Popular Movies',
    },
    {
      items: uniqueMediaOverviewItems(
        topRatedMovies.results.map(mapMovieOverviewItem)
      ),
      mediaType: MediaType.Movie,
      seeAllHref: buildHref(
        '/movies/top_rated',
        topRatedMovieParams as Record<string, string>
      ),
      title: 'Highest Rated Movies of All Time',
    },
    {
      items: uniqueMediaOverviewItems(
        popularTV.results.map(mapTVShowOverviewItem)
      ),
      mediaType: MediaType.Tv,
      seeAllHref: buildHref(
        '/tv/popular',
        popularTVParams as Record<string, string>
      ),
      title: 'Popular TV Shows',
    },
    {
      items: uniqueMediaOverviewItems(
        topRatedTV.results.map(mapTVShowOverviewItem)
      ),
      mediaType: MediaType.Tv,
      seeAllHref: buildHref(
        '/tv/top_rated',
        topRatedTVParams as Record<string, string>
      ),
      title: 'Highest Rated TV Shows of All Time',
    },
  ];
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user?.id);
  const [dashboardState, discoveryState] = await Promise.all([
    isAuthenticated
      ? getSectionState(getDashboardData())
      : Promise.resolve({ data: undefined, error: undefined }),
    getSectionState(loadDiscoverySections()),
  ]);

  return (
    <Home
      dashboardState={dashboardState}
      discoverySections={discoveryState.data ?? []}
      isAuthenticated={isAuthenticated}
      userName={session?.user?.name ?? undefined}
    />
  );
}
