import { MediaRail } from 'lib/components/shared/MediaRail';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { MediaSearchBar } from 'lib/pages/media/media-search-bar';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import type { MediaType } from 'lib/types';
import type Link from 'next/link';
import type { ComponentProps } from 'react';

export type MediaOverviewItem = MediaCardItem;

type MediaOverviewSection = {
  items: Array<MediaOverviewItem>;
  itemLimit?: number;
  seeAllHref: ComponentProps<typeof Link>['href'];
  title: string;
};

type MediaOverviewPageProps = {
  mediaType: MediaType.Movie | MediaType.Tv;
  searchPlaceholder: string;
  sections: Array<MediaOverviewSection>;
  subtitle: string;
  title: string;
};

export const mapMovieOverviewItem = (
  movie: MovieListItemType
): MediaOverviewItem => ({
  id: movie.id,
  posterPath: movie.poster_path,
  title: movie.title,
});

export const mapTVShowOverviewItem = (show: TVShowItem): MediaOverviewItem => ({
  id: show.id,
  posterPath: show.poster_path,
  title: show.name,
});

export const uniqueMediaOverviewItems = (
  items: Array<MediaOverviewItem>
): Array<MediaOverviewItem> =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());

export const MediaOverviewPage = ({
  mediaType,
  searchPlaceholder,
  sections,
  subtitle,
  title,
}: MediaOverviewPageProps) => (
  <PageShell>
    <PageHeading
      actions={
        <MediaSearchBar mediaType={mediaType} placeholder={searchPlaceholder} />
      }
      subtitle={subtitle}
      title={title}
    />

    {sections.map((section) => (
      <MediaRail
        itemLimit={section.itemLimit}
        items={section.items}
        key={section.title}
        mediaType={mediaType}
        seeAllHref={section.seeAllHref}
        title={section.title}
      />
    ))}
  </PageShell>
);
