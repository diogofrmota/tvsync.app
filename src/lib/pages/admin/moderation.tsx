'use client';

import {
  Button,
  Field,
  Flex,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  type AdminActionState,
  type AdminLookupState,
  banUserAccount,
  lookupUserAccount,
  unbanUserAccount,
} from 'lib/features/admin/actions';
import {
  AdminFeedback,
  AdminRow,
  AdminSection,
  formatAdminDate,
  formatAdminNumber,
} from 'lib/pages/admin/panels';
import type { AdminDashboardData } from 'lib/pages/admin/types';
import type { AdminUserRecord } from 'lib/services/database/admin.server';
import { useActionState } from 'react';

const initialAction: AdminActionState = {};
const initialLookup: AdminLookupState = {};

const UserCard = ({ user }: { user: AdminUserRecord }) => (
  <Stack
    background="bg"
    borderColor={user.bannedAt ? 'red.500' : 'border'}
    borderRadius="lg"
    borderWidth="1px"
    gap={2}
    padding={4}
  >
    <Text fontSize="md" fontWeight="700">
      @{user.username}
      {user.bannedAt ? ' — banned' : ''}
    </Text>
    <Text color="fg.muted" fontSize="sm" wordBreak="break-word">
      {user.email}
    </Text>
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={1}>
      <Text color="fg.muted" fontSize="xs">
        Joined {formatAdminDate(user.createdAt)}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        Email verified {user.emailVerifiedAt ? 'yes' : 'no'}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        Sign-in: {user.providers}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        Profile: {user.privacySetting}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        Library {formatAdminNumber(user.libraryItems)} · Ratings{' '}
        {formatAdminNumber(user.ratings)}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        Episodes watched {formatAdminNumber(user.episodesWatched)}
      </Text>
    </SimpleGrid>
    {user.bannedAt ? (
      <Text color="red.300" fontSize="xs">
        Banned {formatAdminDate(user.bannedAt)}
        {user.banReason ? ` — ${user.banReason}` : ''}
      </Text>
    ) : null}
  </Stack>
);

/**
 * One form drives look up, ban, and unban so a moderator types the account
 * once. Each button targets its own action, and every action re-checks the
 * admin session server-side before it touches a row.
 */
export const AdminModeration = ({
  recentBans,
}: {
  recentBans: AdminDashboardData['recentBans'];
}) => {
  const [lookupState, lookupAction, isLookingUp] = useActionState(
    lookupUserAccount,
    initialLookup
  );
  const [banState, banAction, isBanning] = useActionState(
    banUserAccount,
    initialAction
  );
  const [unbanState, unbanAction, isUnbanning] = useActionState(
    unbanUserAccount,
    initialAction
  );
  const isPending = isLookingUp || isBanning || isUnbanning;

  return (
    <AdminSection
      description="Look up an account by email address or username, then suspend or restore it. A ban blocks new sign-ins and revokes every session the account already had."
      title="Moderation"
    >
      <form action={lookupAction}>
        <fieldset
          disabled={isPending}
          style={{ border: 0, margin: 0, padding: 0 }}
        >
          <Stack gap={4}>
            <Field.Root required>
              <Field.Label>Email address or username</Field.Label>
              <Input
                autoCapitalize="none"
                borderColor="white"
                maxLength={254}
                name="identifier"
                placeholder="viewer@example.com"
                type="text"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>
                Ban reason (optional, stored with the ban)
              </Field.Label>
              <Input
                borderColor="white"
                maxLength={300}
                name="reason"
                placeholder="Repeated abuse reports"
                type="text"
              />
            </Field.Root>
            <Flex gap={3} wrap="wrap">
              <Button loading={isLookingUp} type="submit" variant="outline">
                Look up
              </Button>
              <Button
                background="red.500"
                color="white"
                formAction={banAction}
                loading={isBanning}
                type="submit"
              >
                Ban account
              </Button>
              <Button
                formAction={unbanAction}
                loading={isUnbanning}
                type="submit"
                variant="outline"
              >
                Unban account
              </Button>
            </Flex>
          </Stack>
        </fieldset>
      </form>
      <AdminFeedback error={lookupState.error} />
      <AdminFeedback error={banState.error} success={banState.success} />
      <AdminFeedback error={unbanState.error} success={unbanState.success} />
      {lookupState.user ? <UserCard user={lookupState.user} /> : null}
      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="600">
          Currently banned
        </Text>
        <AdminFeedback error={recentBans.error ?? undefined} />
        {recentBans.data?.length ? (
          recentBans.data.map((ban) => (
            <AdminRow
              key={ban.userId}
              meta={`${ban.email} · banned ${formatAdminDate(ban.bannedAt)}${
                ban.banReason ? ` · ${ban.banReason}` : ''
              }`}
              title={`@${ban.username}`}
            />
          ))
        ) : (
          <Text color="fg.muted" fontSize="sm" opacity={0.7}>
            No accounts are banned.
          </Text>
        )}
      </Stack>
    </AdminSection>
  );
};
