import type { DiscoveryListSetting } from 'lib/pages/media/discovery-rails';
import type {
  AdminAuditEntry,
  AdminBanRecord,
  AdminCuratedList,
  AdminLoadResult,
  AdminOverviewStats,
  AdminPrivacySummary,
} from 'lib/services/database/admin.server';

/**
 * Presence of the integrations the app depends on, derived from the server
 * environment. Only whether a value is configured is ever sent to the browser —
 * never the value itself.
 */
export type AdminHealth = {
  cronSecretConfigured: boolean;
  databaseConfigured: boolean;
  environment: string;
  generatedAt: string;
  googleOAuthConfigured: boolean;
  omdbConfigured: boolean;
  resendConfigured: boolean;
  siteUrl: string;
  tmdbConfigured: boolean;
};

export type AdminDashboardData = {
  actor: string;
  auditLog: AdminLoadResult<Array<AdminAuditEntry>>;
  curatedLists: AdminLoadResult<Array<AdminCuratedList>>;
  health: AdminHealth;
  lists: Array<DiscoveryListSetting>;
  privacy: AdminLoadResult<AdminPrivacySummary>;
  recentBans: AdminLoadResult<Array<AdminBanRecord>>;
  stats: AdminLoadResult<AdminOverviewStats>;
};
