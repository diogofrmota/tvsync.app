'use client';

import { getMediaLibraryQuickState } from 'lib/features/library/quick-actions';
import { updateFavorite } from 'lib/features/profile/favorite-actions';
import { addToWatchlist } from 'lib/features/watchlist/actions';
import { WatchStatus } from 'lib/types';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getMediaLibraryKey,
  type MediaLibraryEntry,
  type MediaLibraryRef,
  toMediaFavoriteKeySet,
  toMediaLibraryStatusMap,
} from './media-library-keys';

type MediaLibraryMutationResult = 'error' | 'login_required' | 'saved';

type MediaLibraryContextValue = {
  /** Saves the title to the library as Planned to Watch. */
  addToLibrary: (item: MediaLibraryRef) => Promise<MediaLibraryMutationResult>;
  getStatus: (item: MediaLibraryRef) => WatchStatus | null;
  isFavorite: (item: MediaLibraryRef) => boolean;
  /** Seeds server-rendered library state before the shared snapshot arrives. */
  seedLibrary: (entries: ReadonlyArray<MediaLibraryEntry>) => void;
  setStatus: (item: MediaLibraryRef, status: WatchStatus) => void;
  toggleFavorite: (
    item: MediaLibraryRef
  ) => Promise<MediaLibraryMutationResult>;
};

const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(
  null
);

const withKey = <Value,>(
  current: ReadonlyMap<string, Value>,
  key: string,
  value: Value
) => new Map(current).set(key, value);

const withoutKey = <Value,>(
  current: ReadonlyMap<string, Value>,
  key: string
) => {
  const next = new Map(current);
  next.delete(key);

  return next;
};

const toggleKey = (current: ReadonlySet<string>, key: string) => {
  const next = new Set(current);

  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }

  return next;
};

const getLoginHref = () => {
  const callbackUrl =
    typeof window === 'undefined'
      ? '/'
      : `${window.location.pathname}${window.location.search}`;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

/**
 * One library/favourite snapshot for the whole page. Every surface that shows
 * library state — poster quick actions on rails, grids, and search results —
 * reads and writes this state, so a title added in a rail is immediately
 * reflected everywhere else on screen without re-rendering the server tree.
 */
export const MediaLibraryProvider = ({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) => {
  const router = useRouter();
  const [statusByKey, setStatusByKey] = useState<
    ReadonlyMap<string, WatchStatus>
  >(() => new Map());
  const [favoriteKeys, setFavoriteKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setStatusByKey(new Map());
      setFavoriteKeys(new Set());
      return;
    }

    let isActive = true;

    getMediaLibraryQuickState()
      .then((state) => {
        if (isActive) {
          setStatusByKey(toMediaLibraryStatusMap(state.library));
          setFavoriteKeys(toMediaFavoriteKeySet(state.favorites));
        }
      })
      .catch(() => {
        // A failed snapshot only means quick actions start from the empty
        // state; every mutation still round-trips to the server.
      });

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  const seedLibrary = useCallback(
    (entries: ReadonlyArray<MediaLibraryEntry>) => {
      setStatusByKey((current) => {
        const missingEntries = entries.filter(
          (entry) => !current.has(getMediaLibraryKey(entry))
        );

        if (missingEntries.length === 0) {
          return current;
        }

        const next = new Map(current);

        for (const entry of missingEntries) {
          next.set(getMediaLibraryKey(entry), entry.status);
        }

        return next;
      });
    },
    []
  );

  const setStatus = useCallback(
    (item: MediaLibraryRef, status: WatchStatus) => {
      setStatusByKey((current) =>
        withKey(current, getMediaLibraryKey(item), status)
      );
    },
    []
  );

  const addToLibrary = useCallback(
    async (item: MediaLibraryRef): Promise<MediaLibraryMutationResult> => {
      const key = getMediaLibraryKey(item);
      setStatusByKey((current) => withKey(current, key, WatchStatus.Planned));

      const result = await addToWatchlist(item).catch(() => ({
        isSaved: false,
        status: 'error' as const,
      }));

      if (result.status === 'saved' && result.isSaved) {
        return 'saved';
      }

      setStatusByKey((current) => withoutKey(current, key));

      if (result.status === 'login_required') {
        router.push(getLoginHref());

        return 'login_required';
      }

      return 'error';
    },
    [router]
  );

  const toggleFavorite = useCallback(
    async (item: MediaLibraryRef): Promise<MediaLibraryMutationResult> => {
      const key = getMediaLibraryKey(item);
      const nextFavorite = !favoriteKeys.has(key);
      setFavoriteKeys((current) => toggleKey(current, key));

      const result = await updateFavorite({
        favorite: nextFavorite,
        mediaType: item.mediaType,
        tmdbId: item.tmdbId,
      }).catch(() => ({ favorite: !nextFavorite, status: 'error' as const }));

      if (result.status === 'saved') {
        // Favouriting a title that is not tracked yet would leave a heart on a
        // card that is not in the library, so membership is kept in sync.
        if (nextFavorite && !statusByKey.has(key)) {
          setStatusByKey((current) =>
            withKey(current, key, WatchStatus.Planned)
          );
          await addToWatchlist(item).catch(() => undefined);
        }

        return 'saved';
      }

      setFavoriteKeys((current) => toggleKey(current, key));

      if (result.status === 'login_required') {
        router.push(getLoginHref());

        return 'login_required';
      }

      return 'error';
    },
    [favoriteKeys, router, statusByKey]
  );

  const value = useMemo<MediaLibraryContextValue>(
    () => ({
      addToLibrary,
      getStatus: (item) => statusByKey.get(getMediaLibraryKey(item)) ?? null,
      isFavorite: (item) => favoriteKeys.has(getMediaLibraryKey(item)),
      seedLibrary,
      setStatus,
      toggleFavorite,
    }),
    [
      addToLibrary,
      favoriteKeys,
      seedLibrary,
      setStatus,
      statusByKey,
      toggleFavorite,
    ]
  );

  return (
    <MediaLibraryContext.Provider value={value}>
      {children}
    </MediaLibraryContext.Provider>
  );
};

/** Returns null outside the provider so cards can render without actions. */
export const useMediaLibrary = () => useContext(MediaLibraryContext);

export const useRequiredMediaLibrary = () => {
  const context = useContext(MediaLibraryContext);

  if (!context) {
    throw new Error('useRequiredMediaLibrary requires MediaLibraryProvider.');
  }

  return context;
};
