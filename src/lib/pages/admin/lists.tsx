'use client';

import { Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react';
import {
  type AdminActionState,
  refreshDiscoveryListNow,
  saveDiscoveryLists,
} from 'lib/features/admin/actions';
import {
  AdminFeedback,
  AdminSection,
  formatAdminDate,
} from 'lib/pages/admin/panels';
import {
  DISCOVERY_LIST_ITEM_LIMIT,
  DISCOVERY_LIST_REFRESH_HOURS,
  DISCOVERY_RAIL_TITLES,
  type DiscoveryListSetting,
} from 'lib/pages/media/discovery-rails';
import { type ChangeEvent, useActionState, useState } from 'react';

const initialState: AdminActionState = {};

const checkboxStyle = { accentColor: '#fbbf24', height: '1rem', width: '1rem' };

const clamp = (value: number, bounds: { max: number; min: number }) =>
  Math.min(bounds.max, Math.max(bounds.min, Math.trunc(value) || bounds.min));

const ToggleField = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) => (
  <label
    style={{
      alignItems: 'center',
      cursor: 'pointer',
      display: 'flex',
      fontSize: '0.8125rem',
      gap: '0.375rem',
    }}
  >
    <input
      checked={checked}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.currentTarget.checked)
      }
      style={checkboxStyle}
      type="checkbox"
    />
    {label}
  </label>
);

const NumberField = ({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) => (
  <Field.Root width="8rem">
    <Field.Label fontSize="xs">{label}</Field.Label>
    <Input
      borderColor="white"
      max={max}
      min={min}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      size="sm"
      type="number"
      value={value}
    />
  </Field.Root>
);

const move = (
  settings: Array<DiscoveryListSetting>,
  index: number,
  offset: number
) => {
  const target = index + offset;

  if (target < 0 || target >= settings.length) {
    return settings;
  }

  const next = [...settings];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);

  return next.map((setting, position) => ({ ...setting, position }));
};

/**
 * The whole table is saved as one payload so a reorder can never be observed
 * half-applied by Home or Explore. Deselecting a list keeps its row — and its
 * sizes — so it can be brought back later without being reconfigured.
 */
export const AdminDiscoveryLists = ({
  lists,
}: {
  lists: Array<DiscoveryListSetting>;
}) => {
  const [settings, setSettings] = useState(lists);
  const [saveState, saveAction, isSaving] = useActionState(
    saveDiscoveryLists,
    initialState
  );
  const [refreshState, refreshAction, isRefreshing] = useActionState(
    refreshDiscoveryListNow,
    initialState
  );

  const update = (key: string, patch: Partial<DiscoveryListSetting>) =>
    setSettings((current) =>
      current.map((setting) =>
        setting.key === key ? { ...setting, ...patch } : setting
      )
    );

  return (
    <AdminSection
      description="These lists are the same for every visitor, which is why one cached fetch serves everyone. Choose where each one appears, in what order, how many titles its See All page carries, and how often it is refetched from TMDB."
      title="Home and Explore lists"
    >
      <form action={saveAction}>
        <input
          name="settings"
          type="hidden"
          value={JSON.stringify(
            settings.map((setting, index) => ({ ...setting, position: index }))
          )}
        />
        <Stack gap={3}>
          {settings.map((setting, index) => (
            <Stack
              background="bg"
              borderColor="border"
              borderRadius="lg"
              borderWidth="1px"
              gap={3}
              key={setting.key}
              opacity={setting.active ? 1 : 0.6}
              padding={4}
            >
              <Flex align="center" gap={3} justify="space-between" wrap="wrap">
                <Text fontSize="sm" fontWeight="700">
                  {index + 1}. {DISCOVERY_RAIL_TITLES[setting.key]}
                </Text>
                <Flex gap={2}>
                  <Button
                    aria-label={`Move ${DISCOVERY_RAIL_TITLES[setting.key]} up`}
                    disabled={index === 0 || isSaving}
                    onClick={() => setSettings(move(settings, index, -1))}
                    size="xs"
                    type="button"
                    variant="outline"
                  >
                    Up
                  </Button>
                  <Button
                    aria-label={`Move ${DISCOVERY_RAIL_TITLES[setting.key]} down`}
                    disabled={index === settings.length - 1 || isSaving}
                    onClick={() => setSettings(move(settings, index, 1))}
                    size="xs"
                    type="button"
                    variant="outline"
                  >
                    Down
                  </Button>
                  <Button
                    formAction={refreshAction}
                    loading={isRefreshing}
                    name="key"
                    size="xs"
                    type="submit"
                    value={setting.key}
                    variant="outline"
                  >
                    Fetch now
                  </Button>
                </Flex>
              </Flex>
              <Flex align="flex-end" gap={4} wrap="wrap">
                <ToggleField
                  checked={setting.active}
                  label="Active"
                  onChange={(active) => update(setting.key, { active })}
                />
                <ToggleField
                  checked={setting.showOnHome}
                  label="Home"
                  onChange={(showOnHome) => update(setting.key, { showOnHome })}
                />
                <ToggleField
                  checked={setting.showOnExplore}
                  label="Explore"
                  onChange={(showOnExplore) =>
                    update(setting.key, { showOnExplore })
                  }
                />
                <NumberField
                  label="Titles in See All"
                  max={DISCOVERY_LIST_ITEM_LIMIT.max}
                  min={DISCOVERY_LIST_ITEM_LIMIT.min}
                  onChange={(itemLimit) =>
                    update(setting.key, {
                      itemLimit: clamp(itemLimit, DISCOVERY_LIST_ITEM_LIMIT),
                    })
                  }
                  value={setting.itemLimit}
                />
                <NumberField
                  label="Refetch every (hours)"
                  max={DISCOVERY_LIST_REFRESH_HOURS.max}
                  min={DISCOVERY_LIST_REFRESH_HOURS.min}
                  onChange={(refreshIntervalHours) =>
                    update(setting.key, {
                      refreshIntervalHours: clamp(
                        refreshIntervalHours,
                        DISCOVERY_LIST_REFRESH_HOURS
                      ),
                    })
                  }
                  value={setting.refreshIntervalHours}
                />
              </Flex>
              <Text color="fg.muted" fontSize="xs" opacity={0.7}>
                Last forced refresh: {formatAdminDate(setting.refreshedAt)}
              </Text>
            </Stack>
          ))}
          <Flex gap={3} wrap="wrap">
            <Button loading={isSaving} type="submit">
              Save list configuration
            </Button>
            <Button
              formAction={refreshAction}
              loading={isRefreshing}
              name="key"
              type="submit"
              value="all"
              variant="outline"
            >
              Refetch every list now
            </Button>
          </Flex>
        </Stack>
      </form>
      <AdminFeedback error={saveState.error} success={saveState.success} />
      <AdminFeedback
        error={refreshState.error}
        success={refreshState.success}
      />
    </AdminSection>
  );
};
