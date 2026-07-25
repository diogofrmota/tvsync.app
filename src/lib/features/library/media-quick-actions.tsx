'use client';

import { Box, Icon, Text } from '@chakra-ui/react';
import { useMediaLibrary } from 'lib/features/library/media-library-provider';
import type { TrackableMediaType } from 'lib/types';
import type { MouseEvent, MouseEventHandler } from 'react';
import { useTransition } from 'react';
import { FiHeart, FiPlus } from 'react-icons/fi';

type MediaQuickActionsProps = {
  mediaType: TrackableMediaType;
  /**
   * Cards that already carry a library status badge (the Movies and TV Shows
   * library grids) show that status instead of a second "Added" chip.
   */
  showAddedBadge?: boolean;
  title: string;
  tmdbId: number;
};

// Deliberately small: the badges sit on top of the artwork, so they mark state
// without hiding the poster behind them.
const badgeSize = { base: '1.5rem', md: '1.75rem' } as const;
const badgeInset = { base: 1, md: 1.5 } as const;

const stopCardNavigation = (event: MouseEvent<HTMLElement>) => {
  event.preventDefault();
  event.stopPropagation();
};

const AddToLibraryButton = ({
  isPending,
  onClick,
  title,
}: {
  isPending: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  title: string;
}) => (
  <Box
    _hover={{ background: 'gold.300', transform: 'scale(1.05)' }}
    alignItems="center"
    asChild
    background="gold.400"
    borderRadius="sm"
    bottom={badgeInset}
    color="gray.900"
    display="flex"
    height={badgeSize}
    justifyContent="center"
    position="absolute"
    right={badgeInset}
    transitionDuration="fast"
    transitionProperty="background, transform"
    transitionTimingFunction="ease-out"
    width={badgeSize}
    zIndex={1}
  >
    <button
      aria-label={`Add ${title} to your library`}
      disabled={isPending}
      onClick={onClick}
      type="button"
    >
      <Icon as={FiPlus} boxSize={{ base: 3.5, md: 4 }} strokeWidth={3} />
    </button>
  </Box>
);

const AddedBadge = () => (
  <Text
    background="gold.400"
    borderRadius="sm"
    bottom={badgeInset}
    color="gray.900"
    fontSize="0.625rem"
    fontWeight="700"
    lineHeight="1"
    paddingX={1.5}
    paddingY={1}
    position="absolute"
    right={badgeInset}
    zIndex={1}
  >
    Added
  </Text>
);

const FavoriteHeartButton = ({
  isFavorite,
  isPending,
  onClick,
  title,
}: {
  isFavorite: boolean;
  isPending: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  title: string;
}) => (
  <Box
    _hover={{ background: 'rgba(5, 6, 6, 0.9)' }}
    alignItems="center"
    asChild
    background="rgba(5, 6, 6, 0.65)"
    borderRadius="full"
    color={isFavorite ? 'red.500' : 'white'}
    display="flex"
    height={badgeSize}
    justifyContent="center"
    position="absolute"
    right={badgeInset}
    top={badgeInset}
    transitionDuration="fast"
    transitionProperty="background, color"
    transitionTimingFunction="ease-out"
    width={badgeSize}
    zIndex={1}
  >
    <button
      aria-label={
        isFavorite
          ? `Remove ${title} from your favourites`
          : `Add ${title} to your favourites`
      }
      aria-pressed={isFavorite}
      disabled={isPending}
      onClick={onClick}
      type="button"
    >
      <Icon
        as={FiHeart}
        boxSize={{ base: 3, md: 3.5 }}
        fill={isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  </Box>
);

/**
 * The quick actions every movie and TV item carries: a yellow plus in the
 * bottom-right corner that saves the title to the library, which then becomes
 * an "Added" chip plus an outlined heart in the top-right corner that turns red
 * when the title is favourited.
 */
export const MediaQuickActions = ({
  mediaType,
  showAddedBadge = true,
  title,
  tmdbId,
}: MediaQuickActionsProps) => {
  const library = useMediaLibrary();
  const [isPending, startTransition] = useTransition();

  if (!library) {
    return null;
  }

  const item = { mediaType, tmdbId };
  const isInLibrary = library.getStatus(item) !== null;
  const isFavorite = library.isFavorite(item);

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    stopCardNavigation(event);
    startTransition(async () => {
      await library.addToLibrary(item);
    });
  };

  const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    stopCardNavigation(event);
    startTransition(async () => {
      await library.toggleFavorite(item);
    });
  };

  return (
    <>
      {isInLibrary ? (
        <FavoriteHeartButton
          isFavorite={isFavorite}
          isPending={isPending}
          onClick={handleFavorite}
          title={title}
        />
      ) : (
        <AddToLibraryButton
          isPending={isPending}
          onClick={handleAdd}
          title={title}
        />
      )}
      {isInLibrary && showAddedBadge ? <AddedBadge /> : null}
    </>
  );
};
