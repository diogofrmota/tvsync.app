import { MovieListContainer } from 'lib/components/movie/list';
import type { Metadata } from 'next';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}): Promise<Metadata> {
  const { query } = await searchParams;
  const title = query ? `Movie search: "${query}"` : 'Movie search';

  return {
    title: `${title} | TVSync`,
    description: 'Search TMDB movies from TVSync.',
    openGraph: {
      title: `${title} | TVSync`,
      description: 'Search TMDB movies from TVSync.',
      url: query
        ? `/movies/search?query=${encodeURIComponent(query)}`
        : '/movies/search',
    },
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  await searchParams;

  return <MovieListContainer listMode="search" />;
}
