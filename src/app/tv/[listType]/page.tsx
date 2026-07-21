import {
  hasMediaListQuery,
  type MediaListSearchParams,
} from 'lib/pages/media/overview.server';
import {
  getTVShowListMetadata,
  TVOverview,
} from 'lib/pages/media/tv-overview.server';
import TVShowList from 'lib/pages/tv/list';
import type { TVShowListType } from 'lib/services/tmdb/tv/list/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ listType: TVShowListType }>;
}) {
  const { listType } = await params;

  return getTVShowListMetadata(listType);
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ listType: TVShowListType }>;
  searchParams: Promise<MediaListSearchParams>;
}) {
  const { listType } = await params;
  const resolvedSearchParams = await searchParams;

  if (listType === 'popular' && !hasMediaListQuery(resolvedSearchParams)) {
    return <TVOverview />;
  }

  return <TVShowList listType={listType} />;
}
