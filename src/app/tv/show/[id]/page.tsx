import TvShowDetailPage, {
  type TvShowDetailPageProps,
} from 'lib/pages/tv/detail';
import { getTVShowCreditsServer } from 'lib/services/tmdb/tv/credits/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 604_800;
export const dynamic = 'force-static';
const tmdbOriginalImageUrl = 'https://image.tmdb.org/t/p/original';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const showId = Number(id);

  if (!Number.isFinite(showId)) {
    return {};
  }

  try {
    const show = await getTvShowDetail(showId);
    const title = show.name || show.original_name || 'TV Show';
    const description =
      show.overview ||
      `View seasons, cast, progress, and tracking for ${title}.`;
    const imagePath = show.backdrop_path ?? show.poster_path;

    return {
      title: `${title} | TVSync`,
      description,
      openGraph: {
        title: `${title} | TVSync`,
        description,
        type: 'video.tv_show',
        url: `/tv/show/${id}`,
        images: imagePath
          ? [
              {
                url: `${tmdbOriginalImageUrl}${imagePath}`,
                alt: `${title} artwork`,
              },
            ]
          : undefined,
      },
    };
  } catch {
    return {
      title: 'TV Show | TVSync',
      description:
        'View TV show details, seasons, progress, and tracking on TVSync.',
    };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  try {
    const showId = Number(id);

    if (!Number.isFinite(showId)) {
      notFound();
    }

    const [data, creditsData] = await Promise.all([
      getTvShowDetail(showId),
      getTVShowCreditsServer(showId),
    ]);

    const props: TvShowDetailPageProps = {
      creditsData,
      data,
    };

    return <TvShowDetailPage {...props} />;
  } catch {
    notFound();
  }
}
