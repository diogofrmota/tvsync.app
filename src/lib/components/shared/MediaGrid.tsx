import GridContainer from 'lib/components/shared/GridContainer';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import PosterCard from 'lib/components/shared/PosterCard';
import type { MediaType } from 'lib/types';

/**
 * Full poster grid shared by the "See All" list routes. Rails preview a list;
 * this renders the complete list in one pass without pagination.
 */
export const MediaGrid = ({
  items,
  mediaType,
}: {
  items: Array<MediaCardItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
}) => (
  <GridContainer>
    {items.map((item) => (
      <PosterCard
        id={item.id}
        imageUrl={item.posterPath}
        key={`${mediaType}-${item.id}`}
        layout="grid"
        mediaType={mediaType}
        name={item.title}
        prefetch={false}
      />
    ))}
  </GridContainer>
);
