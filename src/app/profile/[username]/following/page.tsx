import { loadProfileConnectionsPage } from 'lib/pages/profile/load-connections.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'TvSync | Following' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ compare?: string; page?: string; q?: string }>;
}) {
  const [{ username }, { compare, page, q = '' }] = await Promise.all([
    params,
    searchParams,
  ]);

  return loadProfileConnectionsPage({
    compare: compare === 'statistics',
    kind: 'following',
    page: Number(page),
    search: q.slice(0, 80),
    username: decodeURIComponent(username),
  });
}
