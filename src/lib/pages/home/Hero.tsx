'use client';

import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { useReducedMotion } from 'framer-motion';
import MotionBox from 'lib/components/MotionBox';
import { ProductFeatures } from 'lib/components/shared/ProductFeatures';
import Link from 'next/link';

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
              Welcome to Tv
              <Text as="span" color="gold.400">
                Sync
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
              Track Movies and TV Shows you are watching and discover what to
              watch next.
            </Text>
          </MotionBox>

          <MotionBox {...reveal(0.22)}>
            <Text color="fg.muted" fontSize="sm">
              Free to use&nbsp;&nbsp;·&nbsp;&nbsp;No ads
            </Text>
          </MotionBox>

          <MotionBox {...reveal(0.28)} width={{ base: 'full', sm: 'auto' }}>
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
        </Stack>
      </Box>

      <MotionBox {...reveal(0.36)}>
        <ProductFeatures />
      </MotionBox>
    </Stack>
  );
};

export default Hero;
