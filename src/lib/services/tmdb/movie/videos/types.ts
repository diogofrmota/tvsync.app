export type MovieVideo = {
  id: string;
  key: string;
  name: string;
  official: boolean;
  publishedAt: string;
  site: string;
  type: string;
};

export type MovieVideosResponse = {
  id: number;
  results: Array<MovieVideo>;
};
