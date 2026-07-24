'use client';

import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useReducedMotion } from 'framer-motion';
import MotionBox from 'lib/components/MotionBox';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { FiBarChart2, FiBookmark, FiCompass, FiEye } from 'react-icons/fi';

type Feature = {
  description: string;
  icon: ComponentType;
  title: string;
};

const features: Array<Feature> = [
  {
    description:
      'Mark movies and episodes as you go, and pick up right where you left off.',
    icon: FiEye,
    title: 'Track what you watch',
  },
  {
    description: 'Save everything you want to see next in one organized place.',
    icon: FiBookmark,
    title: 'Build your watchlist',
  },
  {
    description:
      'Explore trending and top-rated titles pulled straight from TMDB.',
    icon: FiCompass,
    title: 'Discover what to watch',
  },
  {
    description: 'Turn your viewing history into personal stats and insights.',
    icon: FiBarChart2,
    title: 'See your progress',
  },
];

const Hero = () => {
  const reduceMotion = useReducedMotion();

  const reveal = (delay: number) =>
    reduceMotion
      ? {}
      : {
          animate: {
            opacity: 1,
            transition: { delay, duration: 0.5, ease: 'easeOut' as const },
            y: 0,
          },
          initial: { opacity: 0, y: 18 },
        };

  return (
    <Stack as="section" gap={{ base: 10, md: 14 }}>
      <Box overflow="visible" position="relative">
        {/* Spotlight glow — the brand's cinematic gold accent. */}
        <Box
          aria-hidden
          background="radial-gradient(ellipse at center, rgba(251, 191, 36, 0.18), rgba(251, 191, 36, 0) 70%)"
          height={{ base: '24rem', md: '34rem' }}
          left="50%"
          pointerEvents="none"
          position="absolute"
          top={{ base: '-7rem', md: '-10rem' }}
          transform="translateX(-50%)"
          width={{ base: '130%', md: '52rem' }}
          zIndex={0}
        />

        <Stack
          align="center"
          gap={{ base: 6, md: 7 }}
          marginX="auto"
          maxWidth="46rem"
          position="relative"
          textAlign="center"
          zIndex={1}
        >
          <MotionBox {...reveal(0.08)}>
            <Heading
              as="h1"
              fontSize={{ base: '4xl', sm: '5xl', md: '6xl' }}
              fontWeight="700"
              lineHeight="1.05"
            >
              Everything you watch,{' '}
              <Text as="span" color="gold.400">
                synced in one place
              </Text>
            </Heading>
          </MotionBox>

          <MotionBox {...reveal(0.16)}>
            <Text
              color="fg"
              fontSize={{ base: 'lg', md: 'xl' }}
              lineHeight="1.6"
              maxWidth="34rem"
            >
              Track what you are watching, both movies and tv shows, and
              discover what to watch next. All in one app.
            </Text>
          </MotionBox>

          <MotionBox {...reveal(0.24)} width={{ base: 'full', sm: 'auto' }}>
            <Flex
              align="center"
              direction={{ base: 'column', sm: 'row' }}
              gap={3}
              justify="center"
              width="full"
            >
              <Button asChild size="lg" width={{ base: 'full', sm: 'auto' }}>
                <Link href="/register">Create your account</Link>
              </Button>
              <Button
                asChild
                background="white"
                color="gray.900"
                size="lg"
                variant="outline"
                width={{ base: 'full', sm: 'auto' }}
                _hover={{ background: 'gray.100' }}
              >
                <Link href="/login">Log in</Link>
              </Button>
            </Flex>
          </MotionBox>

          <MotionBox {...reveal(0.3)}>
            <Text color="fg.muted" fontSize="sm">
              Free to use · Clean UI · No ads
            </Text>
          </MotionBox>
        </Stack>
      </Box>

      <MotionBox {...reveal(0.36)}>
        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: 4 }}
          gap={{ base: 3, md: 4 }}
        >
          {features.map((feature) => (
            <Stack
              background="bg.surface"
              borderColor="border"
              borderRadius="xl"
              borderWidth="1px"
              gap={3}
              height="full"
              key={feature.title}
              padding={5}
            >
              <Flex align="center" gap={3}>
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
                  <Icon as={feature.icon} boxSize={5} />
                </Flex>
                <Text fontSize="md" fontWeight="600">
                  {feature.title}
                </Text>
              </Flex>
              <Text color="fg.muted" fontSize="sm" lineHeight="1.5">
                {feature.description}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </MotionBox>
    </Stack>
  );
};

export default Hero;
