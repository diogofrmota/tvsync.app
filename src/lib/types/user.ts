import type { MediaType, RatingValue, WatchStatus } from 'lib/types/media';
import type { PrivacySetting } from 'lib/types/privacy';

export type UserProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  privacy: PrivacySetting;
  createdAt: string;
  updatedAt: string;
};

export type EpisodeProgress = {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt?: string;
};

export type UserMedia = {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: Exclude<MediaType, MediaType.Person>;
  status: WatchStatus;
  rating?: RatingValue;
  privacy: PrivacySetting;
  episodeProgress?: EpisodeProgress;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};
