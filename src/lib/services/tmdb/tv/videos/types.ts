export type TvVideo = {
  id: string;
  key: string;
  name: string;
  official: boolean;
  publishedAt: string;
  site: string;
  type: string;
};

export type TvVideosResponse = {
  id: number;
  results: Array<TvVideo>;
};
