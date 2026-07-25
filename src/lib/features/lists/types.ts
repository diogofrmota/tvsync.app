import type { MediaCardEntry } from 'lib/components/shared/media-item';

export type CustomListSummary = {
  createdAt: string;
  description: string;
  id: string;
  itemCount: number;
  name: string;
};

export type CustomListWithItems = CustomListSummary & {
  items: Array<MediaCardEntry>;
};

export const CUSTOM_LIST_NAME_MAX_LENGTH = 60;
export const CUSTOM_LIST_DESCRIPTION_MAX_LENGTH = 280;

/** Personalized list rails preview the same number of titles as every rail. */
export const PROFILE_CUSTOM_LIST_PREVIEW_COUNT = 3;

export const getCustomListHref = (listId: string) =>
  `/profile/lists/${listId}` as const;
