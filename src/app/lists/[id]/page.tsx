import { CuratedListPage } from 'lib/pages/media/curated-list.server';
import { findPublicCuratedList } from 'lib/services/database/curated-lists.server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const list = await findPublicCuratedList(id);

  if (!list) {
    return { title: 'TvSync | List' };
  }

  const description =
    list.description || 'A collection of movies and TV shows picked by TvSync.';

  return {
    title: `TvSync | ${list.name}`,
    description,
    openGraph: {
      title: `TvSync | ${list.name}`,
      description,
      url: `/lists/${id}`,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Only published lists resolve, so an unpublished draft is a 404 rather than
  // a page anyone who guesses the id can read.
  const list = await findPublicCuratedList(id);

  if (!list) {
    notFound();
  }

  return <CuratedListPage list={list} />;
}
