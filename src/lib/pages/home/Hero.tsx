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
          <MotionBox {...reveal(0)}>
            <Flex
              align="center"
              borderColor="border.strong"
              borderRadius="full"
              borderWidth="1px"
              color="gray.100"
              gap={2}
              paddingX={4}
              paddingY={1.5}
            >
              <Box
                aria-hidden
                background="gold.400"
                borderRadius="full"
                boxShadow="0 0 12px 1px rgba(251, 191, 36, 0.7)"
                height="0.5rem"
                width="0.5rem"
              />
              <Text fontSize="sm" fontWeight="500" letterSpacing="0.01em">
                The home for film &amp; TV lovers
              </Text>
            </Flex>
          </MotionBox>

          <MotionBox {...reveal(0.08)}>
            <Heading
              as="h1"
              fontSize={{ base: '4xl', sm: '5xl', md: '6xl' }}
              fontWeight="700"
              lineHeight="1.05"
            >
              Everything you watch,{' '}
              <Text as="span" color="gold.400">
                in perfect sync
              </Text>
            </Heading>
          </MotionBox>

          <MotionBox {...reveal(0.16)}>
            <Text
              color="fg.muted"
              fontSize={{ base: 'lg', md: 'xl' }}
              lineHeight="1.6"
              maxWidth="34rem"
            >
              Track what you&apos;re watching, build your watchlist, and
              discover what to watch next — all in one clean, distraction-free
              space.
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
                size="lg"
                variant="outline"
                width={{ base: 'full', sm: 'auto' }}
              >
                <Link href="/login">Log in</Link>
              </Button>
            </Flex>
          </MotionBox>

          <MotionBox {...reveal(0.3)}>
            <Text color="fg.muted" fontSize="sm">
              Free to use · No ads · Powered by TMDB
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
              <Flex
                align="center"
                background="rgba(251, 191, 36, 0.12)"
                borderRadius="lg"
                color="gold.400"
                height="2.5rem"
                justify="center"
                width="2.5rem"
              >
                <Icon as={feature.icon} boxSize={5} />
              </Flex>
              <Stack gap={1}>
                <Text fontSize="md" fontWeight="600">
                  {feature.title}
                </Text>
                <Text color="fg.muted" fontSize="sm" lineHeight="1.5">
                  {feature.description}
                </Text>
              </Stack>
            </Stack>
          ))}
        </SimpleGrid>
      </MotionBox>
    </Stack>
  );
};

export default Hero;
