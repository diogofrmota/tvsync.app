import { loadOwnLibraryPreview } from 'lib/features/library/library-preview.server';
import { loadOwnCustomList } from 'lib/features/lists/custom-lists.server';
import { ProfileListDetailPage } from 'lib/pages/profile/list-detail';
import { requireOwnProfile } from 'lib/pages/profile/route-guards.server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'A personalized list of movies and TV shows.',
  title: 'TvSync | Personalized List',
};

// The picker offers the most recent library titles rather than the whole
// library, so opening a list stays a bounded number of TMDB reads.
const LIBRARY_PICKER_LIMIT = 50;

export default async function Page({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  await requireOwnProfile(`/profile/lists/${listId}`);
  const list = await loadOwnCustomList(listId).catch(() => null);

  if (!list) {
    notFound();
  }

  const libraryOptions = await loadOwnLibraryPreview({
    limit: LIBRARY_PICKER_LIMIT,
  }).catch(() => []);

  return <ProfileListDetailPage libraryOptions={libraryOptions} list={list} />;
}
