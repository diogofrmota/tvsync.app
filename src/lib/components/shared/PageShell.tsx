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
  titleIcon,
  subtitle,
  actions,
}: {
  title: string;
  /** Rendered after the title, e.g. the red heart on favourite lists. */
  titleIcon?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <Flex
    align={{ base: 'flex-start', md: 'end' }}
    direction={{ base: 'column', md: 'row' }}
    gap={{ base: 3, md: 4 }}
    justify="space-between"
  >
    <Stack gap={2} maxWidth="48rem" minWidth={0}>
      <Heading
        alignItems="center"
        as="h1"
        display="flex"
        fontSize={{ base: '2xl', md: '4xl' }}
        fontWeight="600"
        gap={3}
      >
        {title}
        {titleIcon}
      </Heading>
      {subtitle ? <Text color="fg.muted">{subtitle}</Text> : null}
    </Stack>
    {/* Actions keep their own width on desktop; on mobile they stretch so a
        search field is wide enough to read its own placeholder. */}
    {actions ? (
      <Box flexShrink={0} width={{ base: 'full', md: 'auto' }}>
        {actions}
      </Box>
    ) : null}
  </Flex>
);
