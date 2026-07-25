'use server';

import { loadOwnLibraryQuickState } from 'lib/features/library/library-quick-state.server';

import type { MediaLibraryQuickState } from './library-quick-state.server';

/**
 * Client entry point for the poster quick actions. The provider calls this once
 * per page load so every rail, grid, and search result on the page shares one
 * library/favourite snapshot instead of asking per card.
 */
export const getMediaLibraryQuickState =
  async (): Promise<MediaLibraryQuickState> => loadOwnLibraryQuickState();
