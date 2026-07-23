import { Box, Grid, Icon, Text } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import {
  FiBarChart2,
  FiClock,
  FiFilm,
  FiPlayCircle,
  FiTv,
} from 'react-icons/fi';

export type ProfileStatCard = {
  detail?: string;
  label: string;
  value: number | string;
};

const iconsByLabel: Record<string, IconType> = {
  'Episodes Watched': FiPlayCircle,
  'Movies Watched': FiFilm,
  'TV Shows Watched': FiTv,
  'Time Spent Watching Movies': FiClock,
  'Time Spent Watching TV Shows': FiClock,
};

const getStatIcon = (label: string): IconType =>
  iconsByLabel[label] ?? FiBarChart2;

export const ProfileStatRail = ({
  cards,
}: {
  cards: Array<ProfileStatCard>;
}) => (
  <Grid
    aria-label="Profile statistics"
    columnGap={4}
    role="list"
    rowGap={4}
    templateColumns={{
      base: 'repeat(2, minmax(0, 1fr))',
      md: 'repeat(3, minmax(0, 1fr))',
      lg: `repeat(${cards.length}, minmax(0, 1fr))`,
    }}
  >
    {cards.map((card) => (
      <Box
        _hover={{ borderColor: 'gold.400' }}
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        key={card.label}
        padding={5}
        role="listitem"
        transitionDuration="fast"
        transitionProperty="border-color"
        transitionTimingFunction="ease-out"
      >
        <Icon as={getStatIcon(card.label)} boxSize={5} color="gold.400" />
        <Text
          color="gold.300"
          fontSize={{ base: '2xl', md: '3xl' }}
          fontWeight="bold"
          marginTop={2}
        >
          {card.value}
        </Text>
        <Text color="fg.muted" fontSize="sm" fontWeight="medium">
          {card.label}
        </Text>
        {card.detail ? (
          <Text color="fg.muted" fontSize="xs" marginTop={2}>
            {card.detail}
          </Text>
        ) : null}
      </Box>
    ))}
  </Grid>
);
