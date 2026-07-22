import { loadProfileConnectionsPage } from 'lib/pages/profile/load-connections.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Followers | TvSync' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ username }, { q = '' }] = await Promise.all([params, searchParams]);

  return loadProfileConnectionsPage({
    kind: 'followers',
    search: q.slice(0, 80),
    username: decodeURIComponent(username),
  });
}
