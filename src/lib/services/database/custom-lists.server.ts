import 'server-only';

import type { TrackableMediaType } from 'lib/types';

import { getDatabaseSql } from './core.server';
import {
  ADD_OWN_CUSTOM_LIST_ITEM_QUERY,
  DELETE_OWN_CUSTOM_LIST_QUERY,
  GET_OWN_CUSTOM_LIST_QUERY,
  INSERT_OWN_CUSTOM_LIST_QUERY,
  LIST_OWN_CUSTOM_LIST_ITEMS_QUERY,
  LIST_OWN_CUSTOM_LISTS_QUERY,
  REMOVE_OWN_CUSTOM_LIST_ITEM_QUERY,
  UPDATE_OWN_CUSTOM_LIST_QUERY,
} from './custom-list-queries';
import { getAuthenticatedUserId } from './tracking.server';

export type CustomListRow = {
  created_at: string;
  description: string;
  id: string;
  item_count: number;
  name: string;
  updated_at: string;
  user_id: string;
};

export type CustomListItemRow = {
  created_at: string;
  list_id: string;
  media_type: TrackableMediaType;
  tmdb_id: number;
};

/**
 * Free-tier guardrails. Lists and their contents are unbounded by nature, so
 * both are capped in SQL (the insert only succeeds while the count is below the
 * cap) instead of trusting the UI to stop.
 */
const CUSTOM_LIST_COUNT_LIMIT = 50;
const CUSTOM_LIST_ITEM_LIMIT = 200;

export const listOwnCustomLists = async (limit = CUSTOM_LIST_COUNT_LIMIT) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql.query(LIST_OWN_CUSTOM_LISTS_QUERY, [
    userId,
    limit,
  ])) as Array<CustomListRow>;
};

export const getOwnCustomList = async (listId: string) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(GET_OWN_CUSTOM_LIST_QUERY, [
    userId,
    listId,
  ])) as Array<CustomListRow>;

  return rows.at(0) ?? null;
};

export const listOwnCustomListItems = async (
  listIds: ReadonlyArray<string>
) => {
  if (listIds.length === 0) {
    return [];
  }

  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql.query(LIST_OWN_CUSTOM_LIST_ITEMS_QUERY, [
    userId,
    listIds,
  ])) as Array<CustomListItemRow>;
};

export const createOwnCustomList = async (input: {
  description: string;
  name: string;
}) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(INSERT_OWN_CUSTOM_LIST_QUERY, [
    userId,
    input.name,
    input.description,
    CUSTOM_LIST_COUNT_LIMIT,
  ])) as Array<Omit<CustomListRow, 'item_count'>>;

  return rows.at(0) ?? null;
};

export const updateOwnCustomList = async (input: {
  description: string;
  listId: string;
  name: string;
}) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(UPDATE_OWN_CUSTOM_LIST_QUERY, [
    userId,
    input.listId,
    input.name,
    input.description,
  ])) as Array<Omit<CustomListRow, 'item_count'>>;

  return rows.at(0) ?? null;
};

export const deleteOwnCustomList = async (listId: string) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(DELETE_OWN_CUSTOM_LIST_QUERY, [
    userId,
    listId,
  ])) as Array<{ id: string }>;

  return Boolean(rows.at(0));
};

export const addOwnCustomListItem = async (input: {
  listId: string;
  mediaType: TrackableMediaType;
  tmdbId: number;
}) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(ADD_OWN_CUSTOM_LIST_ITEM_QUERY, [
    userId,
    input.listId,
    input.tmdbId,
    input.mediaType,
    CUSTOM_LIST_ITEM_LIMIT,
  ])) as Array<CustomListItemRow>;

  return rows.at(0) ?? null;
};

export const removeOwnCustomListItem = async (input: {
  listId: string;
  mediaType: TrackableMediaType;
  tmdbId: number;
}) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(REMOVE_OWN_CUSTOM_LIST_ITEM_QUERY, [
    userId,
    input.listId,
    input.tmdbId,
    input.mediaType,
  ])) as Array<CustomListItemRow>;

  return Boolean(rows.at(0));
};
