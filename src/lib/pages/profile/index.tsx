import {
  Avatar,
  Badge,
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Separator,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { LogoutButton } from 'lib/pages/auth/client-actions';
import type { AuthSessionIssue } from 'lib/services/auth/session-error.server';
import type { DatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import { PrivacySetting } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

import { ProfileForm, type ProfileFormValues } from './profile-form';
import { ThemePreference } from './theme-preference';

type ProfileAccessIssueProps = {
  issue: AuthSessionIssue;
};

type ProfilePageProps = {
  databaseIssue?: DatabaseAvailabilityIssue | null;
  email?: string | null;
  name?: string | null;
  profile: OwnProfile | null;
  tvStats?: ProfileTVStats;
};

export type ProfileTVStats = {
  completed: number;
  dropped: number;
  paused: number;
  planned: number;
  total: number;
  watching: number;
};

const createUsernameFallback = (email?: string | null) =>
  (email?.split('@').at(0) ?? 'tvsync_user')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'tvsync_user';

export const ProfileAccessIssue = ({ issue }: ProfileAccessIssueProps) => (
  <Grid gap={6} marginX="auto" maxWidth="40rem" paddingX={8}>
    <Box borderColor="red.300" borderRadius="md" borderWidth="1px" padding={5}>
      <Heading as="h1" fontSize={['xl', '2xl']} marginBottom={3}>
        {issue.title}
      </Heading>
      <Text color="fg.muted" marginBottom={5}>
        {issue.description}
      </Text>
      <Button asChild variant="solid">
        <Link href={'/login?callbackUrl=/profile' as Route}>Log in again</Link>
      </Button>
    </Box>
  </Grid>
);

const getInitialValues = ({
  email,
  name,
  profile,
}: ProfilePageProps): ProfileFormValues => {
  const fallbackName = name?.trim() || 'TVSync User';

  return {
    bio: profile?.bio ?? '',
    displayName: profile?.display_name ?? fallbackName,
    email: profile?.email ?? email ?? '',
    name: profile?.name ?? fallbackName,
    privacySetting: profile?.privacy_setting ?? PrivacySetting.Private,
    username: profile?.username ?? createUsernameFallback(email),
  };
};

const StatTile = ({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) => (
  <Box borderColor="border" borderRadius="md" borderWidth="1px" padding={5}>
    <Text color="fg.muted" fontSize="sm">
      {label}
    </Text>
    <Text fontSize="2xl" fontWeight="bold">
      {value}
    </Text>
  </Box>
);

export const ProfilePage = ({
  databaseIssue = null,
  email,
  name,
  profile,
  tvStats = {
    completed: 0,
    dropped: 0,
    paused: 0,
    planned: 0,
    total: 0,
    watching: 0,
  },
}: ProfilePageProps) => {
  const initialValues = getInitialValues({ email, name, profile });
  const isFirstSetup = !profile;
  const isProfileFormDisabled = Boolean(databaseIssue);
  const avatarName = initialValues.displayName || initialValues.name;

  return (
    <Grid gap={8} marginX="auto" maxWidth="64rem" paddingX={8}>
      <Stack gap={2}>
        <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="500">
          Profile
        </Heading>
        <Text color="white">
          Manage your account settings and review your TV show progress.
        </Text>
      </Stack>

      <Grid
        alignItems="center"
        gap={6}
        templateColumns={['1fr', 'auto 1fr auto']}
      >
        <Avatar.Root aria-label={`${avatarName} profile avatar`} size="2xl">
          <Avatar.Fallback name={avatarName} />
        </Avatar.Root>

        <VStack align="stretch" gap={2}>
          <HStack flexWrap="wrap" gap={3}>
            <Heading as="h2" fontSize={['xl', '2xl']} wordBreak="break-word">
              {initialValues.displayName}
            </Heading>
            <Badge textTransform="none" variant="subtle">
              @{initialValues.username}
            </Badge>
          </HStack>
          <Text color="fg.muted">
            {isFirstSetup
              ? 'Finish your profile setup before personal tracking is added.'
              : 'Your generated avatar uses profile text only; no image uploads or storage are needed.'}
          </Text>
        </VStack>

        <LogoutButton />
      </Grid>

      <Separator />

      {databaseIssue && (
        <Box
          borderColor="orange.300"
          borderRadius="md"
          borderWidth="1px"
          color="orange.600"
          padding={4}
        >
          <Heading as="h2" fontSize="md" marginBottom={2}>
            {databaseIssue.title}
          </Heading>
          <Text>{databaseIssue.description}</Text>
        </Box>
      )}

      <Grid gap={8} templateColumns={['1fr', 'minmax(0, 1fr) 18rem']}>
        <Box>
          <Heading as="h2" fontSize="xl" marginBottom={4}>
            Basic settings
          </Heading>
          <ProfileForm
            disabled={isProfileFormDisabled}
            initialValues={initialValues}
          />
        </Box>

        <Grid alignContent="start" gap={5}>
          <Box
            borderColor="border"
            borderRadius="md"
            borderWidth="1px"
            padding={5}
          >
            <Heading as="h2" fontSize="md" marginBottom={3}>
              Current visibility
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Your profile is currently set to{' '}
              <Text as="span" color="fg" fontWeight="semibold">
                {initialValues.privacySetting}
              </Text>
              . Private keeps profile data available only to you. Public will be
              eligible for future public profile and review surfaces.
            </Text>
          </Box>

          <Box
            borderColor="border"
            borderRadius="md"
            borderWidth="1px"
            padding={5}
          >
            <Heading as="h2" fontSize="md" marginBottom={3}>
              Appearance
            </Heading>
            <ThemePreference />
          </Box>
        </Grid>
      </Grid>

      <Box>
        <Heading as="h2" fontSize="xl" marginBottom={4}>
          TV show statistics
        </Heading>
        <SimpleGrid columns={[1, 2, 3]} gap={4}>
          <StatTile label="Saved shows" value={tvStats.total} />
          <StatTile label="Watching" value={tvStats.watching} />
          <StatTile label="Plan to watch" value={tvStats.planned} />
          <StatTile label="Finished" value={tvStats.completed} />
          <StatTile label="Paused" value={tvStats.paused} />
          <StatTile label="Dropped" value={tvStats.dropped} />
        </SimpleGrid>
      </Box>
    </Grid>
  );
};
