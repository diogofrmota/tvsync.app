export enum MediaType {
  Movie = 'movie',
  Person = 'person',
  Tv = 'tv',
}

export type RatingValue =
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 3.5
  | 4
  | 4.5
  | 5
  | 5.5
  | 6
  | 6.5
  | 7
  | 7.5
  | 8
  | 8.5
  | 9
  | 9.5
  | 10;

export enum WatchStatus {
  Planned = 'planned',
  Watching = 'watching',
  Completed = 'completed',
  Paused = 'paused',
  Dropped = 'dropped',
  Watched = 'watched',
}

export type TrackableMediaType = MediaType.Movie | MediaType.Tv;

export type RatingTargetType =
  | MediaType.Movie
  | MediaType.Tv
  | 'tv_episode'
  | 'tv_season';

export type RatingTarget = {
  episodeNumber?: number;
  mediaType: RatingTargetType;
  seasonNumber?: number;
  tmdbId: number;
};

export type MovieWatchStatus = WatchStatus.Planned | WatchStatus.Watched;

export type TvWatchStatus =
  | WatchStatus.Planned
  | WatchStatus.Watching
  | WatchStatus.Completed
  | WatchStatus.Dropped
  | WatchStatus.Paused;

export type MediaWatchStatusMap = {
  [MediaType.Movie]: MovieWatchStatus;
  [MediaType.Tv]: TvWatchStatus;
};

export const MOVIE_WATCH_STATUSES = [
  WatchStatus.Planned,
  WatchStatus.Watched,
] as const satisfies ReadonlyArray<MovieWatchStatus>;

export const TV_WATCH_STATUSES = [
  WatchStatus.Planned,
  WatchStatus.Watching,
  WatchStatus.Completed,
  WatchStatus.Dropped,
  WatchStatus.Paused,
] as const satisfies ReadonlyArray<TvWatchStatus>;
