import { Box, Flex, Text } from '@chakra-ui/react';

export type ProfileStatCard = {
  detail?: string;
  label: string;
  value: number | string;
};

export const ProfileStatRail = ({
  cards,
}: {
  cards: Array<ProfileStatCard>;
}) => (
  <Flex
    aria-label="Profile statistics"
    gap={4}
    overflowX="auto"
    paddingBottom={3}
    role="list"
    scrollSnapType="x mandatory"
    style={{ WebkitOverflowScrolling: 'touch' }}
  >
    {cards.map((card) => (
      <Box
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        flex="0 0 auto"
        key={card.label}
        minHeight="8.5rem"
        padding={5}
        role="listitem"
        scrollSnapAlign="start"
        width={{ base: '15rem', md: '17rem' }}
      >
        <Text color="fg.muted" fontSize="sm" fontWeight="medium">
          {card.label}
        </Text>
        <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
          {card.value}
        </Text>
        {card.detail ? (
          <Text color="fg.muted" fontSize="xs" marginTop={2}>
            {card.detail}
          </Text>
        ) : null}
      </Box>
    ))}
  </Flex>
);
