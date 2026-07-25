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
  keepActionsInline = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /**
   * Keeps the actions on the title line at every width instead of stacking
   * them underneath on small screens. Used where the actions are compact and
   * the extra row would push the page content below the fold.
   */
  keepActionsInline?: boolean;
}) => (
  <Flex
    align={keepActionsInline ? 'center' : { base: 'flex-start', md: 'end' }}
    direction={keepActionsInline ? 'row' : { base: 'column', md: 'row' }}
    gap={{ base: 3, md: 4 }}
    justify="space-between"
  >
    <Stack gap={2} maxWidth="48rem" minWidth={0}>
      <Heading
        as="h1"
        fontSize={
          keepActionsInline
            ? { base: 'xl', sm: '2xl', md: '4xl' }
            : { base: '2xl', md: '4xl' }
        }
        fontWeight="600"
      >
        {title}
      </Heading>
      {subtitle ? <Text color="fg.muted">{subtitle}</Text> : null}
    </Stack>
    {actions ? <Box flexShrink={0}>{actions}</Box> : null}
  </Flex>
);
