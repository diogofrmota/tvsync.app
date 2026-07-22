import { loadProfileConnectionsPage } from 'lib/pages/profile/load-connections.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Following | TvSync' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ compare?: string; q?: string }>;
}) {
  const [{ username }, { compare, q = '' }] = await Promise.all([
    params,
    searchParams,
  ]);

  return loadProfileConnectionsPage({
    compare: compare === 'statistics',
    kind: 'following',
    search: q.slice(0, 80),
    username: decodeURIComponent(username),
  });
}
