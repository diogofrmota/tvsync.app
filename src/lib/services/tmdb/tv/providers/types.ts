export type TvWatchProvider = {
  displayPriority: number;
  logoPath: string | null;
  providerId: number;
  providerName: string;
};

export type TvWatchProviderRegion = {
  ads: Array<TvWatchProvider>;
  buy: Array<TvWatchProvider>;
  flatrate: Array<TvWatchProvider>;
  free: Array<TvWatchProvider>;
  link: string;
  rent: Array<TvWatchProvider>;
};

export type TvWatchProvidersResponse = {
  id: number;
  results: Record<string, TvWatchProviderRegion>;
};
