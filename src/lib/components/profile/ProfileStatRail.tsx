'use client';

import { Box, Grid, Icon, Text } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { FiBarChart2, FiClock, FiEdit3, FiFilm, FiTv } from 'react-icons/fi';

export type ProfileStatCard = {
  detail?: string;
  label: string;
  value: number | string;
};

const iconsByLabel: Record<string, IconType> = {
  'Movies Finished': FiFilm,
  'Number of Reviews': FiEdit3,
  'TV Shows Finished': FiTv,
  'Total Watch Time': FiClock,
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
      md: 'repeat(4, minmax(0, 1fr))',
    }}
  >
    {cards.map((card) => (
      <Box
        _hover={{ borderColor: 'gold.400' }}
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        key={card.label}
        padding={{ base: 3, md: 4 }}
        role="listitem"
        transitionDuration="fast"
        transitionProperty="border-color"
        transitionTimingFunction="ease-out"
      >
        <Box alignItems="center" display="flex" gap={{ base: 2, md: 3 }}>
          <Icon as={getStatIcon(card.label)} boxSize={5} color="gold.400" />
          <Text
            color="gold.300"
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight="bold"
          >
            {card.value}
          </Text>
        </Box>
        <Text color="fg.muted" fontSize="sm" fontWeight="medium" marginTop={2}>
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
