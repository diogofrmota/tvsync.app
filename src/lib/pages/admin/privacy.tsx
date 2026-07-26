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
  type AdminDataRequestState,
  eraseUserAccountForRequest,
  exportUserDataForRequest,
} from 'lib/features/admin/actions';
import {
  AdminFeedback,
  AdminSection,
  AdminStat,
  formatAdminNumber,
} from 'lib/pages/admin/panels';
import type { AdminDashboardData } from 'lib/pages/admin/types';
import { useActionState } from 'react';

const initialExport: AdminDataRequestState = {};
const initialErase: AdminActionState = {};

const downloadExport = (state: AdminDataRequestState) => {
  if (!state.json) {
    return;
  }

  const url = URL.createObjectURL(
    new Blob([state.json], { type: 'application/json' })
  );
  const link = document.createElement('a');

  link.download = state.filename ?? 'tvsync-data-request.json';
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * The data-rights desk. Users serve their own access and erasure rights from
 * Edit Profile; this panel exists for the requests that arrive by email from
 * someone who can no longer sign in, which is the case the Privacy Policy
 * points at the Contact page.
 *
 * Both actions re-verify the admin session and are written to the audit log by
 * the username they named — the exported data itself is never logged and never
 * stored, it is handed straight to the browser as a download.
 */
export const AdminPrivacyRequests = ({
  privacy,
}: {
  privacy: AdminDashboardData['privacy'];
}) => {
  const [exportState, exportAction, isExporting] = useActionState(
    exportUserDataForRequest,
    initialExport
  );
  const [eraseState, eraseAction, isErasing] = useActionState(
    eraseUserAccountForRequest,
    initialErase
  );

  return (
    <AdminSection
      description="GDPR and CCPA data-subject requests for accounts that cannot use Edit Profile themselves. Every action here is audited."
      title="Privacy requests"
    >
      <AdminFeedback error={privacy.error ?? undefined} />
      {privacy.data ? (
        <SimpleGrid columns={{ base: 2, md: 3 }} gap={3}>
          <AdminStat
            hint="Objected to usage analytics"
            label="Opt-outs"
            value={formatAdminNumber(privacy.data.analyticsOptOuts)}
          />
          <AdminStat
            hint="Nightly cron purges older entries"
            label="Audit retention"
            value={`${formatAdminNumber(privacy.data.auditLogRetentionDays)} days`}
          />
          <AdminStat
            hint="Personal data is never sold or shared"
            label="Sale of data"
            value="None"
          />
        </SimpleGrid>
      ) : null}

      <Stack
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        gap={3}
        padding={4}
      >
        <Text fontSize="sm" fontWeight="600">
          Access request (right to know)
        </Text>
        <form action={exportAction}>
          <Flex align="flex-end" gap={3} wrap="wrap">
            <Field.Root flex="1" minWidth="16rem">
              <Field.Label>Email or username</Field.Label>
              <Input
                autoCapitalize="none"
                autoComplete="off"
                name="identifier"
                type="text"
              />
            </Field.Root>
            <Button loading={isExporting} type="submit" variant="outline">
              Build export
            </Button>
          </Flex>
        </form>
        <AdminFeedback
          error={exportState.error}
          success={exportState.success}
        />
        {exportState.json ? (
          <Button
            alignSelf="flex-start"
            onClick={() => downloadExport(exportState)}
            size="sm"
            type="button"
          >
            Download {exportState.filename}
          </Button>
        ) : null}
      </Stack>

      <Stack
        borderColor="red.500"
        borderRadius="lg"
        borderWidth="1px"
        gap={3}
        padding={4}
      >
        <Text fontSize="sm" fontWeight="600">
          Erasure request (right to delete)
        </Text>
        <Text color="fg.muted" fontSize="xs" opacity={0.7}>
          Removes the profile and everything that cascades from it: library,
          progress, favourites, ratings, reviews, provider links, tokens, and
          follows. This cannot be undone.
        </Text>
        <form action={eraseAction}>
          <Flex align="flex-end" gap={3} wrap="wrap">
            <Field.Root flex="1" minWidth="14rem">
              <Field.Label>Email or username</Field.Label>
              <Input
                autoCapitalize="none"
                autoComplete="off"
                name="identifier"
                type="text"
              />
            </Field.Root>
            <Field.Root flex="1" minWidth="14rem">
              <Field.Label>Type the username to confirm</Field.Label>
              <Input
                autoCapitalize="none"
                autoComplete="off"
                name="confirmation"
                type="text"
              />
            </Field.Root>
            <Button
              borderColor="red.400"
              color="red.400"
              loading={isErasing}
              type="submit"
              variant="outline"
            >
              Erase account
            </Button>
          </Flex>
        </form>
        <AdminFeedback error={eraseState.error} success={eraseState.success} />
      </Stack>
    </AdminSection>
  );
};
