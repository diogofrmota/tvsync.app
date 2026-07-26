'use client';

import {
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  type AdminActionState,
  refreshAdminStats,
  runAdminMaintenance,
  signOutOfAdmin,
} from 'lib/features/admin/actions';
import { AdminCuratedLists } from 'lib/pages/admin/curated-lists';
import {
  formatAdminChange,
  formatAdminDate,
  formatAdminNumber,
} from 'lib/pages/admin/format';
import { AdminDiscoveryLists } from 'lib/pages/admin/lists';
import { AdminModeration } from 'lib/pages/admin/moderation';
import {
  AdminFeedback,
  AdminRow,
  AdminSection,
  AdminStat,
} from 'lib/pages/admin/panels';
import { AdminPrivacyRequests } from 'lib/pages/admin/privacy';
import type { AdminDashboardData } from 'lib/pages/admin/types';
import { useActionState } from 'react';

const initialState: AdminActionState = {};

const AdminOverview = ({ stats }: { stats: AdminDashboardData['stats'] }) => {
  const [state, formAction, isPending] = useActionState(
    refreshAdminStats,
    initialState
  );
  const data = stats.data;

  return (
    <AdminSection
      actions={
        <form action={formAction}>
          <Button loading={isPending} size="sm" type="submit" variant="outline">
            Recalculate
          </Button>
        </form>
      }
      description="The four figures worth watching, counted exactly. The two 30-day tiles state their change against the 30 days before them."
      title="Overview"
    >
      <AdminFeedback
        error={stats.error ?? state.error}
        success={state.success}
      />
      {data ? (
        <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3}>
          <AdminStat
            hint="Registered accounts"
            label="Users"
            value={formatAdminNumber(data.totalUsers)}
          />
          <AdminStat
            hint="Blocked from signing in"
            label="Banned users"
            value={formatAdminNumber(data.bannedUsers)}
          />
          <AdminStat
            hint={formatAdminChange(
              data.signupsLastMonth,
              data.signupsPrevious30Days
            )}
            label="New users (30 days)"
            value={formatAdminNumber(data.signupsLastMonth)}
          />
          <AdminStat
            hint={formatAdminChange(
              data.activeUsersLast30Days,
              data.activeUsersPrevious30Days
            )}
            label="Active users (30 days)"
            value={formatAdminNumber(data.activeUsersLast30Days)}
          />
        </SimpleGrid>
      ) : (
        <Text color="fg.muted" fontSize="sm">
          Statistics are unavailable until the database can be read.
        </Text>
      )}
    </AdminSection>
  );
};

const AdminMaintenance = ({
  health,
}: {
  health: AdminDashboardData['health'];
}) => {
  const [state, formAction, isPending] = useActionState(
    runAdminMaintenance,
    initialState
  );
  const checks = [
    { label: 'TMDB API key', ok: health.tmdbConfigured },
    { label: 'Neon database', ok: health.databaseConfigured },
    { label: 'Resend email', ok: health.resendConfigured },
    { label: 'Google OAuth', ok: health.googleOAuthConfigured },
    { label: 'OMDb (IMDb ratings)', ok: health.omdbConfigured },
    { label: 'Cleanup cron secret', ok: health.cronSecretConfigured },
  ];

  return (
    <AdminSection
      actions={
        <form action={formAction}>
          <Button loading={isPending} size="sm" type="submit" variant="outline">
            Purge expired auth rows
          </Button>
        </form>
      }
      description="Integration status is read from the server environment; no secret value is ever sent to this page."
      title="System"
    >
      <AdminFeedback error={state.error} success={state.success} />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={2}>
        {checks.map((check) => (
          <Flex
            align="center"
            borderColor="border"
            borderRadius="md"
            borderWidth="1px"
            gap={2}
            justify="space-between"
            key={check.label}
            padding={2}
          >
            <Text fontSize="sm">{check.label}</Text>
            <Text
              color={check.ok ? 'green.300' : 'orange.300'}
              fontSize="xs"
              fontWeight="700"
            >
              {check.ok ? 'configured' : 'missing'}
            </Text>
          </Flex>
        ))}
      </SimpleGrid>
      <Text color="fg.muted" fontSize="xs" opacity={0.7}>
        {health.environment} · {health.siteUrl} · loaded{' '}
        {formatAdminDate(health.generatedAt)}
      </Text>
    </AdminSection>
  );
};

const AdminAuditLog = ({
  auditLog,
}: {
  auditLog: AdminDashboardData['auditLog'];
}) => (
  <AdminSection
    description="Every privileged action is recorded. IP addresses are stored only as a keyed digest."
    title="Admin activity"
  >
    <AdminFeedback error={auditLog.error ?? undefined} />
    {auditLog.data?.length ? (
      auditLog.data.map((entry) => (
        <AdminRow
          key={entry.id}
          meta={`${formatAdminDate(entry.createdAt)} · ${entry.actor}${
            entry.details ? ` · ${entry.details}` : ''
          }`}
          title={`${entry.action}${entry.target ? ` → ${entry.target}` : ''}`}
        />
      ))
    ) : (
      <Text color="fg.muted" fontSize="sm" opacity={0.7}>
        No admin actions recorded yet.
      </Text>
    )}
  </AdminSection>
);

export const AdminDashboard = ({ data }: { data: AdminDashboardData }) => (
  <Stack gap={6}>
    <Flex
      align={{ base: 'flex-start', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      gap={3}
      justify="space-between"
    >
      <Stack gap={1}>
        <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="600">
          TvSync - Admin Access
        </Heading>
        <Text color="fg.muted" fontSize="sm" opacity={0.7}>
          Signed in as {data.actor}
        </Text>
      </Stack>
      <form action={signOutOfAdmin}>
        <Button size="sm" type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </Flex>
    <AdminOverview stats={data.stats} />
    <AdminModeration recentBans={data.recentBans} />
    <AdminPrivacyRequests privacy={data.privacy} />
    <AdminCuratedLists curatedLists={data.curatedLists} />
    <AdminDiscoveryLists lists={data.lists} />
    <AdminMaintenance health={data.health} />
    <AdminAuditLog auditLog={data.auditLog} />
  </Stack>
);
