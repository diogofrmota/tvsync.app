import { MovieListPage } from 'lib/pages/media/media-list.server';
import {
  getMovieSectionMetadata,
  MovieOverview,
} from 'lib/pages/media/movie-overview.server';
import {
  hasMediaListQuery,
  type MediaListSearchParams,
} from 'lib/pages/media/overview.server';
import type { ListType } from 'lib/services/tmdb/movie/list/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: ListType }>;
}) {
  const { section } = await params;

  return getMovieSectionMetadata(section);
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: ListType }>;
  searchParams: Promise<MediaListSearchParams>;
}) {
  const { section } = await params;
  const resolvedSearchParams = await searchParams;

  if (section === 'popular' && !hasMediaListQuery(resolvedSearchParams)) {
    return <MovieOverview />;
  }

  return (
    <MovieListPage searchParams={resolvedSearchParams} section={section} />
  );
}
