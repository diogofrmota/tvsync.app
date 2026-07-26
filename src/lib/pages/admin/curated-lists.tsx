'use client';

import { Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react';
import {
  type AdminActionState,
  type AdminCuratedSearchState,
  addTitleToCuratedList,
  createCuratedList,
  deleteCuratedList,
  removeTitleFromCuratedList,
  searchCuratedListCandidates,
} from 'lib/features/admin/actions';
import { formatAdminDate } from 'lib/pages/admin/format';
import { AdminFeedback, AdminRow, AdminSection } from 'lib/pages/admin/panels';
import type { AdminDashboardData } from 'lib/pages/admin/types';
import type { AdminCuratedList } from 'lib/services/database/admin.server';
import { MediaType } from 'lib/types';
import { useActionState } from 'react';

const initialAction: AdminActionState = {};
const initialSearch: AdminCuratedSearchState = {};

const mediaLabel = (mediaType: string) =>
  mediaType === MediaType.Movie ? 'Movie' : 'TV show';

/**
 * One list: the titles already on it, each with its own remove button, and the
 * TMDB search that adds new ones. Search and add are separate submissions, so
 * the results stay on screen while several titles are added in a row.
 */
const CuratedListCard = ({ list }: { list: AdminCuratedList }) => {
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
      padding={4}
    >
      <Flex align="flex-start" gap={3} justify="space-between" wrap="wrap">
        <Stack gap={0} minWidth={0}>
          <Text fontSize="md" fontWeight="700">
            {list.name}
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
 * re-verifies the admin session before it touches a row.
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

  return (
    <AdminSection
      description="Build a collection by hand: name the list, then search TMDB for movies and TV shows and add them one at a time."
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

      {curatedLists.data?.length ? (
        <Stack gap={3}>
          {curatedLists.data.map((list) => (
            <CuratedListCard key={list.id} list={list} />
          ))}
        </Stack>
      ) : (
        <Text color="fg.muted" fontSize="sm" opacity={0.7}>
          No custom lists yet.
        </Text>
      )}
    </AdminSection>
  );
};
