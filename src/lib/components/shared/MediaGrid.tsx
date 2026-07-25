import GridContainer from 'lib/components/shared/GridContainer';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import PosterCard from 'lib/components/shared/PosterCard';
import type { MediaType } from 'lib/types';

/**
 * Full poster grid shared by the "See All" list routes. Rails preview a list;
 * this renders the complete list in one pass without pagination. Mixed lists
 * (favourites, personalized lists) set `mediaType` per item.
 */
export const MediaGrid = ({
  items,
  mediaType,
}: {
  items: Array<MediaCardItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
}) => (
  <GridContainer>
    {items.map((item) => {
      const itemMediaType = item.mediaType ?? mediaType;

      return (
        <PosterCard
          id={item.id}
          imageUrl={item.posterPath}
          key={`${itemMediaType}-${item.id}`}
          layout="grid"
          mediaType={itemMediaType}
          name={item.title}
          prefetch={false}
        />
      );
    })}
  </GridContainer>
);
