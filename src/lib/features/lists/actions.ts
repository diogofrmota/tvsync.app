'use server';

import { getAuthSession } from 'lib/services/auth/session.server';
import {
  addOwnCustomListItem,
  createOwnCustomList,
  deleteOwnCustomList,
  removeOwnCustomListItem,
  updateOwnCustomList,
} from 'lib/services/database/custom-lists.server';
import { MediaType, type TrackableMediaType } from 'lib/types';

import {
  CUSTOM_LIST_DESCRIPTION_MAX_LENGTH,
  CUSTOM_LIST_NAME_MAX_LENGTH,
} from './types';

type CustomListActionResult = {
  listId: string | null;
  message: string;
  status: 'error' | 'login_required' | 'saved';
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const failure = (message: string): CustomListActionResult => ({
  listId: null,
  message,
  status: 'error',
});

const loginRequired = (): CustomListActionResult => ({
  listId: null,
  message: 'Sign in before changing your personalized lists.',
  status: 'login_required',
});

const isAuthenticated = async () => Boolean((await getAuthSession())?.user?.id);

const isValidListId = (listId: string) => UUID_PATTERN.test(listId.trim());

const isValidTitle = (input: {
  mediaType: TrackableMediaType;
  tmdbId: number;
}) =>
  Number.isInteger(input.tmdbId) &&
  input.tmdbId > 0 &&
  (input.mediaType === MediaType.Movie || input.mediaType === MediaType.Tv);

const normalizeName = (name: string) =>
  name.normalize('NFKC').trim().slice(0, CUSTOM_LIST_NAME_MAX_LENGTH);

const normalizeDescription = (description: string) =>
  description
    .normalize('NFKC')
    .trim()
    .slice(0, CUSTOM_LIST_DESCRIPTION_MAX_LENGTH);

// Every list surface renders dynamically per request, so mutations only need
// the calling client to refresh; nothing here invalidates a cached route.

export const createCustomList = async (input: {
  description?: string;
  name: string;
}): Promise<CustomListActionResult> => {
  const name = normalizeName(input.name ?? '');
  const description = normalizeDescription(input.description ?? '');

  if (!name) {
    return failure('Enter a name for your list.');
  }

  if (!(await isAuthenticated())) {
    return loginRequired();
  }

  try {
    const created = await createOwnCustomList({ description, name });

    if (!created) {
      return failure(
        'That list could not be created. You may already have a list with that name.'
      );
    }

    return {
      listId: created.id,
      message: `"${created.name}" was created.`,
      status: 'saved',
    };
  } catch {
    return failure('We could not create that list. Please try again.');
  }
};

export const updateCustomList = async (input: {
  description?: string;
  listId: string;
  name: string;
}): Promise<CustomListActionResult> => {
  const name = normalizeName(input.name ?? '');
  const description = normalizeDescription(input.description ?? '');

  if (!(isValidListId(input.listId) && name)) {
    return failure('Enter a name for your list.');
  }

  if (!(await isAuthenticated())) {
    return loginRequired();
  }

  try {
    const updated = await updateOwnCustomList({
      description,
      listId: input.listId.trim(),
      name,
    });

    if (!updated) {
      return failure('That list could not be updated.');
    }

    return {
      listId: updated.id,
      message: 'Your list was updated.',
      status: 'saved',
    };
  } catch {
    return failure(
      'We could not update that list. You may already have a list with that name.'
    );
  }
};

export const deleteCustomList = async (input: {
  listId: string;
}): Promise<CustomListActionResult> => {
  if (!isValidListId(input.listId)) {
    return failure('We could not delete that list.');
  }

  if (!(await isAuthenticated())) {
    return loginRequired();
  }

  try {
    const deleted = await deleteOwnCustomList(input.listId.trim());

    if (!deleted) {
      return failure('That list could not be deleted.');
    }

    return { listId: null, message: 'Your list was deleted.', status: 'saved' };
  } catch {
    return failure('We could not delete that list. Please try again.');
  }
};

export const addTitleToCustomList = async (input: {
  listId: string;
  mediaType: TrackableMediaType;
  tmdbId: number;
}): Promise<CustomListActionResult> => {
  if (!(isValidListId(input.listId) && isValidTitle(input))) {
    return failure('Choose a title to add to this list.');
  }

  if (!(await isAuthenticated())) {
    return loginRequired();
  }

  try {
    const added = await addOwnCustomListItem({
      listId: input.listId.trim(),
      mediaType: input.mediaType,
      tmdbId: input.tmdbId,
    });

    if (!added) {
      return failure(
        'That title is already in this list, or the list is full.'
      );
    }

    return {
      listId: input.listId.trim(),
      message: 'The title was added to your list.',
      status: 'saved',
    };
  } catch {
    return failure('We could not add that title. Please try again.');
  }
};

export const removeTitleFromCustomList = async (input: {
  listId: string;
  mediaType: TrackableMediaType;
  tmdbId: number;
}): Promise<CustomListActionResult> => {
  if (!(isValidListId(input.listId) && isValidTitle(input))) {
    return failure('We could not remove that title.');
  }

  if (!(await isAuthenticated())) {
    return loginRequired();
  }

  try {
    const removed = await removeOwnCustomListItem({
      listId: input.listId.trim(),
      mediaType: input.mediaType,
      tmdbId: input.tmdbId,
    });

    if (!removed) {
      return failure('That title could not be removed.');
    }

    return {
      listId: input.listId.trim(),
      message: 'The title was removed from your list.',
      status: 'saved',
    };
  } catch {
    return failure('We could not remove that title. Please try again.');
  }
};
