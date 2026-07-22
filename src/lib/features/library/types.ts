import type { MovieWatchStatus } from 'lib/types';

export type MovieLibraryItem = {
  dateAdded: string;
  id: string;
  posterPath: null | string;
  status: MovieWatchStatus;
  title: string;
  tmdbId: number;
};
