'use client';

import { Flex, Icon, SimpleGrid, Text } from '@chakra-ui/react';
import { FiBell, FiEye, FiStar, FiUsers } from 'react-icons/fi';

export const PRODUCT_FEATURES = [
  { icon: FiEye, title: 'Track what you are watching' },
  { icon: FiStar, title: 'Rate and Review your favourite shows' },
  { icon: FiUsers, title: 'See what your friends are watching' },
  { icon: FiBell, title: 'Get notified about new episodes' },
] as const;

export const ProductFeatures = () => (
  <SimpleGrid
    background="bg.surface"
    borderRadius="xl"
    columns={{ base: 1, sm: 2, lg: 4 }}
    gap={{ base: 5, md: 6 }}
    padding={{ base: 5, md: 6 }}
  >
    {PRODUCT_FEATURES.map((feature) => (
      <Flex align="center" gap={3} key={feature.title}>
        <Flex
          align="center"
          background="rgba(251, 191, 36, 0.12)"
          borderRadius="lg"
          color="gold.400"
          flexShrink={0}
          height="2.5rem"
          justify="center"
          width="2.5rem"
        >
          <Icon aria-hidden as={feature.icon} boxSize={5} />
        </Flex>
        <Text fontSize="md" fontWeight="600">
          {feature.title}
        </Text>
      </Flex>
    ))}
  </SimpleGrid>
);
