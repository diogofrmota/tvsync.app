import { MovieListContainer } from 'lib/components/movie/list';
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
    title: `${title} Movies | TVSync`,
    description: `Discover ${title.toLowerCase()} movies from TMDB on TVSync.`,
    openGraph: {
      title: `${title} Movies | TVSync`,
      description: `Discover ${title.toLowerCase()} movies from TMDB on TVSync.`,
      url: `/movies/genre/${genre}`,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre } = await params;

  return <MovieListContainer genre={genre} listMode="discover" />;
}
