import type { MovieWatchStatus, TvWatchStatus } from 'lib/types';

export type MovieLibraryItem = {
  dateAdded: string;
  id: string;
  posterPath: null | string;
  status: MovieWatchStatus;
  title: string;
  tmdbId: number;
};

export type TvLibrarySectionStatus = Extract<
  TvWatchStatus,
  'planned' | 'watching' | 'completed'
>;

export type TvLibraryItem = {
  dateAdded: string;
  id: string;
  intentStatus: TvWatchStatus;
  posterPath: null | string;
  progressPercent: number;
  status: TvLibrarySectionStatus;
  title: string;
  tmdbId: number;
  totalEpisodeCount: number;
  watchedEpisodeCount: number;
};
