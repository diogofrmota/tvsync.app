import {
  Box,
  Button,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export const SectionHeading = ({
  title,
  description,
  seeAllHref,
}: {
  title: string;
  description?: string;
  seeAllHref?: ComponentProps<typeof Link>['href'];
}) => (
  <Flex align="end" gap={4} justify="space-between">
    <Stack gap={1} minWidth={0}>
      <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="600">
        {title}
      </Heading>
      {description ? (
        <Text _dark={{ color: 'gray.100' }} color="gray.600" fontSize="sm">
          {description}
        </Text>
      ) : null}
    </Stack>
    {seeAllHref ? (
      <Button asChild flexShrink={0} size="sm" variant="outline">
        <Link href={seeAllHref}>See All</Link>
      </Button>
    ) : null}
  </Flex>
);

type StatePanelProps = {
  action?: ReactNode;
  message: string;
  title?: string;
  tone?: 'neutral' | 'error' | 'success';
  status?: string;
};
const stateBorderColors = {
  error: 'red.400',
  neutral: 'border',
  success: 'green.400',
} as const;
export const StatePanel = ({
  action,
  message,
  title,
  tone = 'neutral',
  status,
}: StatePanelProps) => (
  <Stack
    aria-live={tone === 'error' ? 'assertive' : 'polite'}
    borderColor={stateBorderColors[tone]}
    borderRadius="md"
    borderStyle="solid"
    borderWidth="1px"
    gap={3}
    padding={5}
    role={tone === 'error' ? 'alert' : 'status'}
  >
    {title ? (
      <Heading as="h3" fontSize="md">
        {title}
      </Heading>
    ) : null}
    <Text _dark={{ color: 'gray.100' }} color="gray.600">
      {message}
    </Text>
    {action ? <Box alignSelf="flex-start">{action}</Box> : null}
    {status ? (
      <Text fontSize="sm" fontWeight="600">
        {status}
      </Text>
    ) : null}
  </Stack>
);

const loadingKeys = [
  'loading-a',
  'loading-b',
  'loading-c',
  'loading-d',
  'loading-e',
  'loading-f',
  'loading-g',
  'loading-h',
  'loading-i',
  'loading-j',
  'loading-k',
  'loading-l',
  'loading-m',
  'loading-n',
  'loading-o',
  'loading-p',
  'loading-q',
  'loading-r',
  'loading-s',
  'loading-t',
  'loading-u',
  'loading-v',
  'loading-w',
  'loading-x',
  'loading-y',
  'loading-z',
  'loading-aa',
];

export const SectionLoading = ({ count = 9 }: { count?: number }) => (
  <Box
    aria-label="Loading content"
    display="grid"
    gap={{ base: 3, md: 5 }}
    gridTemplateColumns={{
      base: 'repeat(3, minmax(0, 1fr))',
      md: 'repeat(6, minmax(0, 1fr))',
      lg: 'repeat(9, minmax(0, 1fr))',
    }}
    role="status"
  >
    {loadingKeys.slice(0, count).map((key) => (
      <Skeleton aspectRatio={2 / 3} borderRadius="md" key={key} />
    ))}
  </Box>
);
