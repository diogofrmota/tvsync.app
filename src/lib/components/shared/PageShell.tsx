import { Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export const pagePaddingX = { base: 4, sm: 6, lg: 8 } as const;

export const PageShell = ({
  children,
  size = 'wide',
}: {
  children: ReactNode;
  size?: 'narrow' | 'wide';
}) => (
  <Stack
    gap={{ base: 8, md: 12 }}
    marginX="auto"
    maxWidth={size === 'narrow' ? '48rem' : '80rem'}
    paddingBottom={{ base: 10, md: 14 }}
    paddingTop={{ base: 8, md: 12 }}
    paddingX={pagePaddingX}
    width="full"
  >
    {children}
  </Stack>
);

export const PageHeading = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <Flex
    align={{ base: 'flex-start', md: 'end' }}
    direction={{ base: 'column', md: 'row' }}
    gap={4}
    justify="space-between"
  >
    <Stack gap={2} maxWidth="48rem">
      <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="600">
        {title}
      </Heading>
      {subtitle ? (
        <Text _dark={{ color: 'gray.100' }} color="gray.600">
          {subtitle}
        </Text>
      ) : null}
    </Stack>
    {actions ? <Box flexShrink={0}>{actions}</Box> : null}
  </Flex>
);
