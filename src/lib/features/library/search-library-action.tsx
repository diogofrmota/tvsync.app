'use client';

import { Button, Field, NativeSelect, Stack, Text } from '@chakra-ui/react';
import { setMediaWatchStatus } from 'lib/features/tracking/actions';
import { addToWatchlist } from 'lib/features/watchlist/actions';
import type { SearchMediaType } from 'lib/pages/search/search-state';
import {
  MediaType,
  MOVIE_WATCH_STATUSES,
  TV_WATCH_STATUSES,
  WatchStatus,
} from 'lib/types';
import { useState, useTransition } from 'react';

type SearchLibraryActionProps = {
  mediaType: SearchMediaType;
  onStatusChange: (status: WatchStatus) => void;
  status: WatchStatus | null;
  title: string;
  tmdbId: number;
};

const statusLabels: Record<WatchStatus, string> = {
  [WatchStatus.Completed]: 'Finished',
  [WatchStatus.Dropped]: 'Dropped',
  [WatchStatus.Paused]: 'Paused',
  [WatchStatus.Planned]: 'Planned to Watch',
  [WatchStatus.Watched]: 'Finished',
  [WatchStatus.Watching]: 'Watching',
};

export const getSearchStatusLabel = (status: WatchStatus | null) =>
  status ? statusLabels[status] : null;

export const SearchLibraryAction = ({
  mediaType,
  onStatusChange,
  status,
  title,
  tmdbId,
}: SearchLibraryActionProps) => {
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'error' | 'success';
  }>();
  const [isPending, startTransition] = useTransition();
  const options =
    mediaType === MediaType.Movie ? MOVIE_WATCH_STATUSES : TV_WATCH_STATUSES;

  const addToLibrary = () => {
    setFeedback(undefined);
    startTransition(async () => {
      const result = await addToWatchlist({ mediaType, tmdbId }).catch(() => ({
        isSaved: false,
        status: 'error' as const,
      }));

      if (result.status === 'error' || !result.isSaved) {
        setFeedback({
          message: 'Could not add this title. Try again.',
          tone: 'error',
        });
        return;
      }

      onStatusChange(WatchStatus.Planned);
      setFeedback({ message: 'Added to your library.', tone: 'success' });
    });
  };

  const updateStatus = (nextStatus: WatchStatus) => {
    const previousStatus = status;
    onStatusChange(nextStatus);
    setFeedback(undefined);

    startTransition(async () => {
      const result = await setMediaWatchStatus({
        mediaType,
        status: nextStatus,
        tmdbId,
      }).catch(() => ({ status: 'error' as const, watchStatus: null }));

      if (result.status === 'error' || !result.watchStatus) {
        if (previousStatus) {
          onStatusChange(previousStatus);
        }
        setFeedback({
          message: 'Could not update the status. Try again.',
          tone: 'error',
        });
        return;
      }

      onStatusChange(result.watchStatus);
      setFeedback({ message: 'Library status updated.', tone: 'success' });
    });
  };

  return (
    <Stack gap={2}>
      {status ? (
        <Field.Root disabled={isPending}>
          <Field.Label fontSize="xs">Library status</Field.Label>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              aria-label={`Library status for ${title}`}
              minHeight="44px"
              onChange={(event) =>
                updateStatus(event.target.value as WatchStatus)
              }
              value={status}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      ) : (
        <Button
          disabled={isPending}
          loading={isPending}
          minHeight="44px"
          onClick={addToLibrary}
          size="xs"
          width="full"
        >
          Add to library
        </Button>
      )}
      {feedback ? (
        <Text
          color={feedback.tone === 'error' ? 'red.500' : 'green.600'}
          fontSize="xs"
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </Text>
      ) : null}
    </Stack>
  );
};
