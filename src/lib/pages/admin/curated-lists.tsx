'use client';

import { Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react';
import {
  type AdminActionState,
  type AdminCuratedSearchState,
  addTitleToCuratedList,
  createCuratedList,
  deleteCuratedList,
  removeTitleFromCuratedList,
  saveCuratedListPlacement,
  searchCuratedListCandidates,
} from 'lib/features/admin/actions';
import { formatAdminDate } from 'lib/pages/admin/format';
import { AdminFeedback, AdminRow, AdminSection } from 'lib/pages/admin/panels';
import type { AdminDashboardData } from 'lib/pages/admin/types';
import type { AdminCuratedList } from 'lib/services/database/admin.server';
import { MediaType } from 'lib/types';
import { type ChangeEvent, useActionState, useState } from 'react';

const initialAction: AdminActionState = {};
const initialSearch: AdminCuratedSearchState = {};

const checkboxStyle = { accentColor: '#fbbf24', height: '1rem', width: '1rem' };

const mediaLabel = (mediaType: string) =>
  mediaType === MediaType.Movie ? 'Movie' : 'TV show';

type CuratedPlacement = Pick<
  AdminCuratedList,
  'active' | 'showOnExplore' | 'showOnHome'
>;

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

const move = (
  lists: Array<AdminCuratedList>,
  index: number,
  offset: number
) => {
  const target = index + offset;

  if (target < 0 || target >= lists.length) {
    return lists;
  }

  const next = [...lists];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);

  return next.map((list, position) => ({ ...list, position }));
};

/**
 * One list: where it is published, the titles already on it with their own
 * remove buttons, and the TMDB search that adds new ones. Search and add are
 * separate submissions, so the results stay on screen while several titles are
 * added in a row.
 */
const CuratedListCard = ({
  index,
  isFirst,
  isLast,
  list,
  onMove,
  onPlacementChange,
}: {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  list: AdminCuratedList;
  onMove: (index: number, offset: number) => void;
  onPlacementChange: (id: string, patch: Partial<CuratedPlacement>) => void;
}) => {
  const [searchState, searchAction, isSearching] = useActionState(
    searchCuratedListCandidates,
    initialSearch
  );
  const [addState, addAction, isAdding] = useActionState(
    addTitleToCuratedList,
    initialAction
  );
  const [removeState, removeAction, isRemoving] = useActionState(
    removeTitleFromCuratedList,
    initialAction
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteCuratedList,
    initialAction
  );
  // Every card mounts its own search state, so results only belong to the list
  // whose form produced them.
  const results =
    searchState.listId === list.id ? (searchState.results ?? []) : [];

  return (
    <Stack
      background="bg"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      gap={4}
      opacity={list.active ? 1 : 0.75}
      padding={4}
    >
      <Flex align="flex-start" gap={3} justify="space-between" wrap="wrap">
        <Stack gap={0} minWidth={0}>
          <Text fontSize="md" fontWeight="700">
            {index + 1}. {list.name}
          </Text>
          <Text color="fg.muted" fontSize="xs" opacity={0.7}>
            {list.items.length} {list.items.length === 1 ? 'title' : 'titles'} ·
            created {formatAdminDate(list.createdAt)}
          </Text>
          {list.description ? (
            <Text color="fg.muted" fontSize="sm" marginTop={1}>
              {list.description}
            </Text>
          ) : null}
        </Stack>
        <Flex gap={2}>
          <Button
            aria-label={`Move ${list.name} up`}
            disabled={isFirst}
            onClick={() => onMove(index, -1)}
            size="xs"
            type="button"
            variant="outline"
          >
            Up
          </Button>
          <Button
            aria-label={`Move ${list.name} down`}
            disabled={isLast}
            onClick={() => onMove(index, 1)}
            size="xs"
            type="button"
            variant="outline"
          >
            Down
          </Button>
          <form action={deleteAction}>
            <input name="listId" type="hidden" value={list.id} />
            <Button
              color="red.300"
              loading={isDeleting}
              size="xs"
              type="submit"
              variant="outline"
            >
              Delete list
            </Button>
          </form>
        </Flex>
      </Flex>

      <Flex align="center" gap={4} wrap="wrap">
        <ToggleField
          checked={list.active}
          label="Published"
          onChange={(active) => onPlacementChange(list.id, { active })}
        />
        <ToggleField
          checked={list.showOnHome}
          label="Home"
          onChange={(showOnHome) => onPlacementChange(list.id, { showOnHome })}
        />
        <ToggleField
          checked={list.showOnExplore}
          label="Explore"
          onChange={(showOnExplore) =>
            onPlacementChange(list.id, { showOnExplore })
          }
        />
        {list.items.length === 0 ? (
          <Text color="fg.muted" fontSize="xs" opacity={0.7}>
            An empty list is never shown, whatever is ticked here.
          </Text>
        ) : null}
      </Flex>

      {list.items.length ? (
        <Stack gap={2}>
          {list.items.map((item) => (
            <AdminRow
              key={`${item.mediaType}-${item.tmdbId}`}
              meta={`${mediaLabel(item.mediaType)} · TMDB ${item.tmdbId}`}
              title={item.title || `TMDB ${item.tmdbId}`}
            >
              <form action={removeAction}>
                <input name="listId" type="hidden" value={list.id} />
                <input name="mediaType" type="hidden" value={item.mediaType} />
                <input name="tmdbId" type="hidden" value={item.tmdbId} />
                <Button
                  loading={isRemoving}
                  size="xs"
                  type="submit"
                  variant="outline"
                >
                  Remove
                </Button>
              </form>
            </AdminRow>
          ))}
        </Stack>
      ) : (
        <Text color="fg.muted" fontSize="sm" opacity={0.7}>
          No titles yet. Search below to add the first one.
        </Text>
      )}

      <form action={searchAction}>
        <input name="listId" type="hidden" value={list.id} />
        <Flex align="flex-end" gap={2} wrap="wrap">
          <Field.Root flex="1 1 16rem" minWidth="12rem">
            <Field.Label fontSize="xs">Search TMDB</Field.Label>
            <Input
              borderColor="white"
              defaultValue={
                searchState.listId === list.id ? searchState.query : ''
              }
              maxLength={120}
              name="query"
              placeholder="Search movies and TV shows"
              size="sm"
              type="search"
            />
          </Field.Root>
          <Button
            loading={isSearching}
            size="sm"
            type="submit"
            variant="outline"
          >
            Search
          </Button>
        </Flex>
      </form>

      {searchState.listId === list.id ? (
        <AdminFeedback error={searchState.error} />
      ) : null}
      <AdminFeedback error={addState.error} success={addState.success} />
      <AdminFeedback error={removeState.error} success={removeState.success} />
      <AdminFeedback error={deleteState.error} />

      {results.length ? (
        <Stack gap={2}>
          <Text fontSize="sm" fontWeight="600">
            Search results
          </Text>
          {results.map((result) => (
            <AdminRow
              key={`${result.mediaType}-${result.tmdbId}`}
              meta={`${mediaLabel(result.mediaType)}${
                result.releaseYear ? ` · ${result.releaseYear}` : ''
              } · TMDB ${result.tmdbId}`}
              title={result.title || `TMDB ${result.tmdbId}`}
            >
              <form action={addAction}>
                <input name="listId" type="hidden" value={list.id} />
                <input
                  name="mediaType"
                  type="hidden"
                  value={result.mediaType}
                />
                <input name="tmdbId" type="hidden" value={result.tmdbId} />
                <input name="title" type="hidden" value={result.title} />
                <input
                  name="posterPath"
                  type="hidden"
                  value={result.posterPath ?? ''}
                />
                <Button loading={isAdding} size="xs" type="submit">
                  Add
                </Button>
              </form>
            </AdminRow>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
};

/**
 * Operator-curated collections. These are hand-picked and global — unrelated to
 * the per-user personalized lists the product removed — and every mutation
 * re-verifies the admin session before it touches a row. Placement is saved for
 * the whole table at once, so Home and Explore can never observe half a
 * reordering.
 */
export const AdminCuratedLists = ({
  curatedLists,
}: {
  curatedLists: AdminDashboardData['curatedLists'];
}) => {
  const [createState, createAction, isCreating] = useActionState(
    createCuratedList,
    initialAction
  );
  const [placementState, placementAction, isSavingPlacement] = useActionState(
    saveCuratedListPlacement,
    initialAction
  );
  const [lists, setLists] = useState(curatedLists.data ?? []);

  const updatePlacement = (id: string, patch: Partial<CuratedPlacement>) =>
    setLists((current) =>
      current.map((list) => (list.id === id ? { ...list, ...patch } : list))
    );

  return (
    <AdminSection
      description="Build a collection by hand: name the list, search TMDB for movies and TV shows and add them one at a time, then publish it to Home, Explore, or both."
      title="Custom lists"
    >
      <form action={createAction}>
        <fieldset
          disabled={isCreating}
          style={{ border: 0, margin: 0, padding: 0 }}
        >
          <Flex align="flex-end" gap={3} wrap="wrap">
            <Field.Root flex="1 1 14rem" minWidth="12rem" required>
              <Field.Label fontSize="xs">List name</Field.Label>
              <Input
                borderColor="white"
                maxLength={80}
                name="name"
                placeholder="Staff Picks"
                size="sm"
                type="text"
              />
            </Field.Root>
            <Field.Root flex="2 1 18rem" minWidth="12rem">
              <Field.Label fontSize="xs">Description (optional)</Field.Label>
              <Input
                borderColor="white"
                maxLength={280}
                name="description"
                placeholder="What this collection is for"
                size="sm"
                type="text"
              />
            </Field.Root>
            <Button loading={isCreating} size="sm" type="submit">
              Create list
            </Button>
          </Flex>
        </fieldset>
      </form>
      <AdminFeedback error={createState.error} success={createState.success} />
      <AdminFeedback error={curatedLists.error ?? undefined} />

      {lists.length ? (
        // The cards carry their own forms (search, add, remove, delete), so the
        // placement payload sits in a form of its own rather than wrapping them
        // — a form inside a form is not valid HTML.
        <Stack gap={3}>
          {lists.map((list, index) => (
            <CuratedListCard
              index={index}
              isFirst={index === 0}
              isLast={index === lists.length - 1}
              key={list.id}
              list={list}
              onMove={(from, offset) =>
                setLists((current) => move(current, from, offset))
              }
              onPlacementChange={updatePlacement}
            />
          ))}
          <form action={placementAction}>
            <input
              name="placements"
              type="hidden"
              value={JSON.stringify(
                lists.map((list, index) => ({
                  active: list.active,
                  id: list.id,
                  position: index,
                  showOnExplore: list.showOnExplore,
                  showOnHome: list.showOnHome,
                }))
              )}
            />
            <Button loading={isSavingPlacement} type="submit">
              Save placement
            </Button>
          </form>
        </Stack>
      ) : (
        <Text color="fg.muted" fontSize="sm" opacity={0.7}>
          No custom lists yet.
        </Text>
      )}
      <AdminFeedback
        error={placementState.error}
        success={placementState.success}
      />
    </AdminSection>
  );
};
