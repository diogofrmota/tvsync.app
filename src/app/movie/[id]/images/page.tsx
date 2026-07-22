import { MovieImagesPage } from 'lib/pages/movie/images';
import { parsePositiveIntegerRouteParam } from 'lib/utils/route-params';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = parsePositiveIntegerRouteParam(id);

  if (movieId === null) {
    notFound();
  }

  return <MovieImagesPage movieId={movieId} />;
}
