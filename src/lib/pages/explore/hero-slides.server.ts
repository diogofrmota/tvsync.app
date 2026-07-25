import 'server-only';

import {
  EXPLORE_HERO_SLIDE_COUNT,
  type ExploreHeroSlide,
} from 'lib/pages/explore/hero';
import { getImdbRatingServer } from 'lib/services/omdb/index.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import { getMovieVideosServer } from 'lib/services/tmdb/movie/videos/index.server';
import { selectTrustedMovieTrailer } from 'lib/services/tmdb/movie/videos/utils';
import { getTvExternalIdsServer } from 'lib/services/tmdb/tv/external-ids/index.server';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import { getTvVideosServer } from 'lib/services/tmdb/tv/videos/index.server';
import { selectTrustedTvTrailer } from 'lib/services/tmdb/tv/videos/utils';
import { MediaType } from 'lib/types';

const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=';

/** Popularity only ranks the candidates; the slide itself never displays it. */
type HeroCandidate = Omit<
  ExploreHeroSlide,
  'imdbId' | 'imdbRating' | 'trailerUrl'
> & { popularity: number };

type HeroExtras = {
  imdbId: string | null;
  trailerKey: string | null;
};

const NO_EXTRAS: HeroExtras = { imdbId: null, trailerKey: null };

const yearFromDate = (date: string | null | undefined) =>
  date ? date.slice(0, 4) : '';

const trailerUrlFromKey = (trailerKey: string | null) =>
  trailerKey ? `${YOUTUBE_WATCH_URL}${trailerKey}` : null;

// A slide is built around the poster, so titles without one are never featured.
const movieCandidates = (movies: Array<MovieListItemType>) =>
  movies
    .filter((movie) => movie.poster_path)
    .map(
      (movie): HeroCandidate => ({
        backdropPath: movie.backdrop_path,
        id: movie.id,
        mediaType: MediaType.Movie,
        overview: movie.overview,
        popularity: movie.popularity,
        posterPath: movie.poster_path,
        title: movie.title,
        voteAverage: movie.vote_average,
        year: yearFromDate(movie.release_date),
      })
    );

const showCandidates = (shows: Array<TVShowItem>) =>
  shows
    .filter((show) => show.poster_path)
    .map(
      (show): HeroCandidate => ({
        backdropPath: show.backdrop_path,
        id: show.id,
        mediaType: MediaType.Tv,
        overview: show.overview,
        popularity: show.popularity,
        posterPath: show.poster_path,
        title: show.name,
        voteAverage: show.vote_average,
        year: yearFromDate(show.first_air_date),
      })
    );

const loadMovieExtras = async (id: number): Promise<HeroExtras> => {
  const [videos, detail] = await Promise.allSettled([
    getMovieVideosServer(id),
    getMovieDetailServer(id),
  ]);

  return {
    imdbId:
      detail.status === 'fulfilled' ? (detail.value.imdb_id ?? null) : null,
    trailerKey:
      videos.status === 'fulfilled'
        ? (selectTrustedMovieTrailer(videos.value)?.key ?? null)
        : null,
  };
};

const loadShowExtras = async (id: number): Promise<HeroExtras> => {
  const [videos, externalIds] = await Promise.allSettled([
    getTvVideosServer(id),
    getTvExternalIdsServer(id),
  ]);

  return {
    imdbId:
      externalIds.status === 'fulfilled' ? externalIds.value.imdb_id : null,
    trailerKey:
      videos.status === 'fulfilled'
        ? (selectTrustedTvTrailer(videos.value)?.key ?? null)
        : null,
  };
};

/**
 * Trailer and IMDb data are extras: a slide still renders with its poster,
 * name, and TMDB score when either lookup fails, so one slow or missing
 * endpoint can never blank out the featured area.
 */
const buildSlide = async ({
  popularity: _popularity,
  ...candidate
}: HeroCandidate): Promise<ExploreHeroSlide> => {
  const extras = await (candidate.mediaType === MediaType.Movie
    ? loadMovieExtras(candidate.id)
    : loadShowExtras(candidate.id)
  ).catch((error) => {
    console.error(
      `Failed to load featured extras for ${candidate.title}:`,
      error
    );
    return NO_EXTRAS;
  });
  const imdbRating = await getImdbRatingServer(extras.imdbId);

  return {
    ...candidate,
    imdbId: extras.imdbId,
    imdbRating: imdbRating?.rating ?? null,
    trailerUrl: trailerUrlFromKey(extras.trailerKey),
  };
};

/**
 * Shapes the featured slideshow: the most popular trending movies and shows,
 * most popular first, each enriched with its trailer link and genuine IMDb
 * rating.
 */
export const buildExploreHeroSlides = (
  movies: Array<MovieListItemType>,
  shows: Array<TVShowItem>
): Promise<Array<ExploreHeroSlide>> =>
  Promise.all(
    [...movieCandidates(movies), ...showCandidates(shows)]
      .sort((left, right) => right.popularity - left.popularity)
      .slice(0, EXPLORE_HERO_SLIDE_COUNT)
      .map(buildSlide)
  );
