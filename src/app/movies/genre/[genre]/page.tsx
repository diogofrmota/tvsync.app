import { MovieListPage } from 'lib/pages/media/media-list.server';
import type { MediaListSearchParams } from 'lib/pages/media/overview.server';
import type { Metadata } from 'next';

const formatGenreTitle = (genre: string) => `Genre ${genre}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre } = await params;
  const title = formatGenreTitle(genre);

  return {
    title: `TvSync | ${title} Movies`,
    description: `Discover ${title.toLowerCase()} movies from TMDB on TvSync.`,
    openGraph: {
      title: `TvSync | ${title} Movies`,
      description: `Discover ${title.toLowerCase()} movies from TMDB on TvSync.`,
      url: `/movies/genre/${genre}`,
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ genre: string }>;
  searchParams: Promise<MediaListSearchParams>;
}) {
  const { genre } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <MovieListPage
      genre={genre}
      searchParams={resolvedSearchParams}
      section="popular"
    />
  );
}
