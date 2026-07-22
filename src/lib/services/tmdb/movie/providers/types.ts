export type MovieWatchProvider = {
  displayPriority: number;
  logoPath: string | null;
  providerId: number;
  providerName: string;
};

export type MovieWatchProviderRegion = {
  ads: Array<MovieWatchProvider>;
  buy: Array<MovieWatchProvider>;
  flatrate: Array<MovieWatchProvider>;
  free: Array<MovieWatchProvider>;
  link: string;
  rent: Array<MovieWatchProvider>;
};

export type MovieWatchProvidersResponse = {
  id: number;
  results: Record<string, MovieWatchProviderRegion>;
};
