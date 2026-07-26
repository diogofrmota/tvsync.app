import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import { AdminDashboard } from 'lib/pages/admin/dashboard';
import { AdminLoginForm } from 'lib/pages/admin/login-form';
import type { AdminHealth } from 'lib/pages/admin/types';
import { getAdminSession } from 'lib/services/admin/session.server';
import {
  listAdminAuditLog,
  listAdminCuratedLists,
  listRecentBans,
  loadAdminOverviewStats,
  loadAdminPrivacySummary,
} from 'lib/services/database/admin.server';
import { loadDiscoveryListSettings } from 'lib/services/database/discovery-lists.server';

const RECENT_RECORD_LIMIT = 10;
const AUDIT_LOG_LIMIT = 20;
const CURATED_LIST_LIMIT = 25;

const AdminShell = ({ children }: { children: React.ReactNode }) => (
  <Box
    marginX="auto"
    maxWidth="72rem"
    paddingBottom={{ base: 10, md: 14 }}
    paddingTop={{ base: 8, md: 12 }}
    paddingX={{ base: 4, sm: 6, lg: 8 }}
    width="full"
  >
    {children}
  </Box>
);

const readHealth = (): AdminHealth => ({
  cronSecretConfigured: Boolean(process.env.CRON_SECRET),
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
  generatedAt: new Date().toISOString(),
  googleOAuthConfigured: Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ),
  omdbConfigured: Boolean(process.env.OMDB_API_KEY),
  resendConfigured: Boolean(
    process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM
  ),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tvsync.app',
  tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
});

const AdminUnavailable = () => (
  <Stack
    background="bg.surface"
    borderColor="border"
    borderRadius="xl"
    borderWidth="1px"
    gap={3}
    marginX="auto"
    maxWidth="32rem"
    padding={{ base: 6, md: 8 }}
  >
    <Heading as="h1" fontSize="xl" fontWeight="600">
      Admin dashboard is not configured
    </Heading>
    <Text color="fg.muted" fontSize="sm">
      Set ADMIN_USER, ADMIN_PASSWORD, and AUTH_SECRET in the deployment
      environment to enable this page. Until all three are present the dashboard
      stays closed rather than falling back to a default login.
    </Text>
  </Stack>
);

/**
 * The single admin page: credentials first, then everything on one scroll. Each
 * panel loads independently and degrades to its own message, so one failing
 * query never takes the dashboard down with it.
 */
export const AdminPage = async () => {
  const session = await getAdminSession();

  if (!session) {
    return (
      <AdminShell>
        {process.env.ADMIN_USER &&
        process.env.ADMIN_PASSWORD &&
        process.env.AUTH_SECRET ? (
          <AdminLoginForm />
        ) : (
          <AdminUnavailable />
        )}
      </AdminShell>
    );
  }

  const [stats, recentBans, curatedLists, auditLog, lists, privacy] =
    await Promise.all([
      loadAdminOverviewStats(),
      listRecentBans(RECENT_RECORD_LIMIT),
      listAdminCuratedLists(CURATED_LIST_LIMIT),
      listAdminAuditLog(AUDIT_LOG_LIMIT),
      loadDiscoveryListSettings(),
      loadAdminPrivacySummary(),
    ]);

  return (
    <AdminShell>
      <AdminDashboard
        data={{
          actor: session.user,
          auditLog,
          curatedLists,
          health: readHealth(),
          lists,
          privacy,
          recentBans,
          stats,
        }}
      />
    </AdminShell>
  );
};
