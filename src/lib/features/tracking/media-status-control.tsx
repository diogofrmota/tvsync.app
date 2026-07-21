'use client';

import { Badge, Field, Grid, NativeSelect, Text } from '@chakra-ui/react';
import {
  getMediaTrackingState,
  setMediaWatchStatus,
} from 'lib/features/tracking/actions';
import {
  MediaType,
  MOVIE_WATCH_STATUSES,
  type TrackableMediaType,
  TV_WATCH_STATUSES,
  WatchStatus,
} from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

type MediaStatusControlProps = {
  initialStatus?: WatchStatus | null;
  label?: string;
  mediaType: TrackableMediaType;
  size?: 'sm' | 'md';
  tmdbId: number;
};

const statusLabels: Record<WatchStatus, string> = {
  [WatchStatus.Completed]: 'Completed',
  [WatchStatus.Dropped]: 'Dropped',
  [WatchStatus.Paused]: 'Paused',
  [WatchStatus.Planned]: 'Planned',
  [WatchStatus.Watched]: 'Watched',
  [WatchStatus.Watching]: 'Watching',
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

export const MediaStatusControl = ({
  initialStatus = null,
  label = 'Your status',
  mediaType,
  size = 'md',
  tmdbId,
}: MediaStatusControlProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [watchStatus, setWatchStatus] = useState<WatchStatus | null>(
    initialStatus
  );
  const [isPending, startTransition] = useTransition();
  const options = useMemo(
    () =>
      mediaType === MediaType.Movie ? MOVIE_WATCH_STATUSES : TV_WATCH_STATUSES,
    [mediaType]
  );

  useEffect(() => {
    let isMounted = true;

    getMediaTrackingState({ mediaType, tmdbId }).then((result) => {
      if (!isMounted) {
        return;
      }

      if (result.status !== 'login_required') {
        setWatchStatus(result.watchStatus);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [mediaType, tmdbId]);

  const handleStatusChange = (nextStatus: WatchStatus) => {
    const previousStatus = watchStatus;
    setWatchStatus(nextStatus);

    startTransition(async () => {
      const result = await setMediaWatchStatus({
        mediaType,
        status: nextStatus,
        tmdbId,
      });

      if (result.status === 'login_required') {
        setWatchStatus(previousStatus);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setWatchStatus(previousStatus);
        return;
      }

      setWatchStatus(result.watchStatus);
      router.refresh();
    });
  };

  return (
    <Grid alignItems="end" gap={2} maxWidth={{ base: '100%', md: '260px' }}>
      <Field.Root disabled={isPending}>
        <Field.Label>{label}</Field.Label>
        <NativeSelect.Root size={size}>
          <NativeSelect.Field
            onChange={(event) =>
              handleStatusChange(event.target.value as WatchStatus)
            }
            value={watchStatus ?? ''}
          >
            <option disabled value="">
              Not set
            </option>
            {options.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      {watchStatus ? (
        <Badge alignSelf="flex-start" colorPalette="teal" variant="subtle">
          {statusLabels[watchStatus]}
        </Badge>
      ) : (
        <Text color="gray.400" fontSize="sm">
          Choose a status to save it.
        </Text>
      )}
    </Grid>
  );
};
