'use client';

import { Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

/**
 * Shared shells for the dashboard. Every section is one bordered card so the
 * page stays readable as a single scroll rather than a navigation tree.
 */
export const AdminSection = ({
  actions,
  children,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) => (
  <Stack
    as="section"
    background="bg.surface"
    borderColor="border"
    borderRadius="xl"
    borderWidth="1px"
    gap={5}
    padding={{ base: 4, md: 6 }}
  >
    <Flex
      align={{ base: 'flex-start', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      gap={3}
      justify="space-between"
    >
      <Stack gap={1} minWidth={0}>
        <Heading as="h2" fontSize={{ base: 'lg', md: 'xl' }} fontWeight="600">
          {title}
        </Heading>
        {description ? (
          <Text color="fg.muted" fontSize="sm" opacity={0.7}>
            {description}
          </Text>
        ) : null}
      </Stack>
      {actions ? <Box flexShrink={0}>{actions}</Box> : null}
    </Flex>
    {children}
  </Stack>
);

export const AdminFeedback = ({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) => {
  if (!(error || success)) {
    return null;
  }

  return (
    <Text
      aria-live={error ? 'assertive' : 'polite'}
      background={error ? 'red.950' : 'green.950'}
      borderColor={error ? 'red.500' : 'green.600'}
      borderRadius="md"
      borderWidth="1px"
      color={error ? 'red.300' : 'green.300'}
      fontSize="sm"
      padding={3}
      role={error ? 'alert' : 'status'}
    >
      {error ?? success}
    </Text>
  );
};

export const AdminStat = ({
  hint,
  label,
  value,
}: {
  hint?: string;
  label: string;
  value: string;
}) => (
  <Stack
    background="bg"
    borderColor="border"
    borderRadius="lg"
    borderWidth="1px"
    gap={1}
    padding={4}
  >
    <Text
      color="fg.muted"
      fontSize="xs"
      opacity={0.7}
      textTransform="uppercase"
    >
      {label}
    </Text>
    <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700">
      {value}
    </Text>
    {hint ? (
      <Text color="fg.muted" fontSize="xs" opacity={0.6}>
        {hint}
      </Text>
    ) : null}
  </Stack>
);

export const AdminRow = ({
  children,
  meta,
  title,
}: {
  children?: ReactNode;
  meta?: string;
  title: string;
}) => (
  <Flex
    align={{ base: 'flex-start', sm: 'center' }}
    borderColor="border"
    borderRadius="lg"
    borderWidth="1px"
    direction={{ base: 'column', sm: 'row' }}
    gap={2}
    justify="space-between"
    padding={3}
  >
    <Stack gap={0} minWidth={0}>
      <Text fontSize="sm" fontWeight="600" wordBreak="break-word">
        {title}
      </Text>
      {meta ? (
        <Text color="fg.muted" fontSize="xs" opacity={0.7}>
          {meta}
        </Text>
      ) : null}
    </Stack>
    {children}
  </Flex>
);
