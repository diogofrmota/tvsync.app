import { loadProfileConnectionsPage } from 'lib/pages/profile/load-connections.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Followers | TvSync' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const [{ username }, { page, q = '' }] = await Promise.all([
    params,
    searchParams,
  ]);

  return loadProfileConnectionsPage({
    kind: 'followers',
    page: Number(page),
    search: q.slice(0, 80),
    username: decodeURIComponent(username),
  });
}
