import 'server-only';

import { Stack } from '@chakra-ui/react';
import { MediaRail } from 'lib/components/shared/MediaRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import { ExploreHero } from 'lib/pages/explore/hero';
import { buildExploreHeroSlides } from 'lib/pages/explore/hero-slides.server';
import { MediaSearchBar } from 'lib/pages/media/media-search-bar';
import {
  type MediaOverviewItem,
  mapMovieOverviewItem,
  mapTVShowOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import {
  buildMediaOverviewHref,
  type MediaQualityFilter,
  qualityFilterFromParams,
  takeMediaOverviewItems,
} from 'lib/pages/media/overview.server';
import {
  getMovieListServer,
  getTrendingMoviesServer,
} from 'lib/services/tmdb/movie/list/index.server';
import type {
  MovieListItemType,
  MovieListParams,
} from 'lib/services/tmdb/movie/list/types';
import {
  getDiscoverTVShowsServer,
  getTrendingTVShowsServer,
} from 'lib/services/tmdb/tv/list/index.server';
import type {
  TVShowItem,
  TVShowListParams,
} from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import type { Route } from 'next';

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

const popularTVShowParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6',
  'vote_count.gte': '500',
} satisfies TVShowListParams;

const topRatedTVShowParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '1500',
} satisfies TVShowListParams;

const trendingMovieQuality: MediaQualityFilter = {
  minVoteAverage: 5.5,
  minVoteCount: 300,
};

const trendingTVShowQuality: MediaQualityFilter = {
  minVoteAverage: 5.5,
  minVoteCount: 150,
};

type ExploreRail = {
  items: Array<MediaOverviewItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: Route;
  title: string;
};

const settledResults = <Item,>(
  result: PromiseSettledResult<{ results: Array<Item> }>
): Array<Item> => (result.status === 'fulfilled' ? result.value.results : []);

const shapeMovies = (
  movies: Array<MovieListItemType>,
  filter?: MediaQualityFilter
) =>
  filter
    ? takeMediaOverviewItems(
        movies,
        filter,
        mapMovieOverviewItem,
        uniqueMediaOverviewItems
      )
    : uniqueMediaOverviewItems(movies.map(mapMovieOverviewItem)).filter(
        (item) => item.posterPath
      );

const shapeShows = (shows: Array<TVShowItem>, filter: MediaQualityFilter) =>
  takeMediaOverviewItems(
    shows,
    filter,
    mapTVShowOverviewItem,
    uniqueMediaOverviewItems
  );

const buildMovieHref = (
  section: 'popular' | 'top_rated' | 'trending_week' | 'upcoming',
  params: Record<string, number | string> = {}
) => buildMediaOverviewHref({ basePath: '/movies', listType: section, params });

const buildTVShowHref = (
  listType: 'popular' | 'top_rated' | 'trending_week',
  params: Record<string, number | string> = {}
) => buildMediaOverviewHref({ basePath: '/tv', listType, params });

export const ExploreDiscover = async () => {
  const [
    trendingMovies,
    trendingShows,
    popularMovies,
    popularShows,
    upcomingMovies,
    topRatedMovies,
    topRatedShows,
  ] = await Promise.allSettled([
    getTrendingMoviesServer({ page: 1 }, 'week'),
    getTrendingTVShowsServer({ page: 1 }, 'week'),
    getMovieListServer({
      params: { page: 1, ...popularMovieParams },
      section: 'popular',
    }),
    getDiscoverTVShowsServer({ page: 1, ...popularTVShowParams }),
    getMovieListServer({ params: { page: 1 }, section: 'upcoming' }),
    getMovieListServer({
      params: { page: 1, ...topRatedMovieParams },
      section: 'top_rated',
    }),
    getDiscoverTVShowsServer({ page: 1, ...topRatedTVShowParams }),
  ]);

  const heroSlides = await buildExploreHeroSlides(
    settledResults<MovieListItemType>(trendingMovies),
    settledResults<TVShowItem>(trendingShows)
  ).catch((error) => {
    console.error('Failed to build the featured slideshow:', error);
    return [];
  });

  const allRails: Array<ExploreRail> = [
    {
      items: shapeMovies(
        settledResults<MovieListItemType>(trendingMovies),
        trendingMovieQuality
      ),
      mediaType: MediaType.Movie,
      seeAllHref: buildMovieHref('trending_week', {
        'vote_average.gte': trendingMovieQuality.minVoteAverage,
        'vote_count.gte': trendingMovieQuality.minVoteCount,
      }),
      title: 'Trending Movies This Week',
    },
    {
      items: shapeShows(
        settledResults<TVShowItem>(trendingShows),
        trendingTVShowQuality
      ),
      mediaType: MediaType.Tv,
      seeAllHref: buildTVShowHref('trending_week', {
        'vote_average.gte': trendingTVShowQuality.minVoteAverage,
        'vote_count.gte': trendingTVShowQuality.minVoteCount,
      }),
      title: 'Trending TV Shows This Week',
    },
    {
      items: shapeMovies(settledResults<MovieListItemType>(upcomingMovies)),
      mediaType: MediaType.Movie,
      seeAllHref: buildMovieHref('upcoming'),
      title: 'New & Upcoming Movies',
    },
    {
      items: shapeMovies(
        settledResults<MovieListItemType>(popularMovies),
        qualityFilterFromParams(popularMovieParams)
      ),
      mediaType: MediaType.Movie,
      seeAllHref: buildMovieHref('popular', popularMovieParams),
      title: 'Most Popular Movies',
    },
    {
      items: shapeShows(
        settledResults<TVShowItem>(popularShows),
        qualityFilterFromParams(popularTVShowParams)
      ),
      mediaType: MediaType.Tv,
      seeAllHref: buildTVShowHref('popular', popularTVShowParams),
      title: 'Most Popular TV Shows',
    },
    {
      items: shapeMovies(
        settledResults<MovieListItemType>(topRatedMovies),
        qualityFilterFromParams(topRatedMovieParams)
      ),
      mediaType: MediaType.Movie,
      seeAllHref: buildMovieHref('top_rated', topRatedMovieParams),
      title: 'Highest Rated Movies of All Time',
    },
    {
      items: shapeShows(
        settledResults<TVShowItem>(topRatedShows),
        qualityFilterFromParams(topRatedTVShowParams)
      ),
      mediaType: MediaType.Tv,
      seeAllHref: buildTVShowHref('top_rated', topRatedTVShowParams),
      title: 'Highest Rated TV Shows of All Time',
    },
  ];
  const rails = allRails.filter((rail) => rail.items.length > 0);

  return (
    <PageShell>
      <Stack gap={{ base: 6, md: 8 }}>
        <PageHeading
          actions={
            <MediaSearchBar
              mediaType={MediaType.Movie}
              placeholder="Search movies and TV shows"
            />
          }
          subtitle="Discover trending titles, new releases, and all-time highlights across movies and TV — all in one place."
          title="Explore"
        />
        {heroSlides.length > 0 ? <ExploreHero slides={heroSlides} /> : null}
      </Stack>
      {rails.length > 0 ? (
        rails.map((rail) => (
          <MediaRail
            items={rail.items}
            key={rail.title}
            mediaType={rail.mediaType}
            seeAllHref={rail.seeAllHref}
            title={rail.title}
          />
        ))
      ) : (
        <StatePanel
          message="Discovery is unavailable right now. Please try again shortly."
          title="Unable to load titles"
          tone="error"
        />
      )}
    </PageShell>
  );
};
