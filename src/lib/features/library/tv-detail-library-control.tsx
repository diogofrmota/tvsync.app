'use client';

import {
  Badge,
  Button,
  Field,
  Grid,
  NativeSelect,
  Text,
} from '@chakra-ui/react';
import {
  removeTvShowFromLibrary,
  updateTvLibraryStatus,
} from 'lib/features/library/actions';
import { TV_LIBRARY_STATUSES } from 'lib/features/library/tv-library-state';
import type { TvLibrarySectionStatus } from 'lib/features/library/types';
import { getMediaTrackingState } from 'lib/features/tracking/actions';
import { MediaType, WatchStatus } from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

const statusLabels: Record<TvLibrarySectionStatus, string> = {
  [WatchStatus.Watching]: 'Watching',
  [WatchStatus.Planned]: 'Planned to Watch',
  [WatchStatus.Completed]: 'Finished',
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const query = searchParams.toString();
  const callbackUrl = query ? `${pathname}?${query}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

export const TvDetailLibraryControl = ({ tmdbId }: { tmdbId: number }) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<TvLibrarySectionStatus | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TvLibrarySectionStatus>(
    WatchStatus.Planned
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    getMediaTrackingState({ mediaType: MediaType.Tv, tmdbId }).then(
      (result) => {
        if (!isMounted) {
          return;
        }

        if (result.status === 'login_required') {
          router.replace(getLoginHref(pathname, searchParams));
          return;
        }

        if (result.status === 'error') {
          setLoadFailed(true);
          setIsLoading(false);
          return;
        }

        const savedStatus = result.watchStatus as TvLibrarySectionStatus | null;
        setStatus(savedStatus);
        setSelectedStatus(savedStatus ?? WatchStatus.Planned);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [pathname, router, searchParams, tmdbId]);

  const saveStatus = (nextStatus: TvLibrarySectionStatus) => {
    const previousStatus = status;
    const previousSelectedStatus = selectedStatus;
    setStatus(nextStatus);
    setSelectedStatus(nextStatus);
    setMessage(null);

    startTransition(async () => {
      const result = await updateTvLibraryStatus({
        status: nextStatus,
        tmdbId,
      });

      if (result.status === 'login_required') {
        setStatus(previousStatus);
        setSelectedStatus(previousSelectedStatus);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setStatus(previousStatus);
        setSelectedStatus(previousSelectedStatus);
        setMessage(result.message);
        return;
      }

      setStatus(result.watchStatus);
      setSelectedStatus(result.watchStatus ?? WatchStatus.Planned);
      setMessage(result.message);
      router.refresh();
    });
  };

  const remove = () => {
    const previousStatus = status;
    setStatus(null);
    setMessage(null);

    startTransition(async () => {
      const result = await removeTvShowFromLibrary({ tmdbId });

      if (result.status === 'login_required') {
        setStatus(previousStatus);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setStatus(previousStatus);
        setMessage(result.message);
        return;
      }

      setStatus(null);
      setSelectedStatus(WatchStatus.Planned);
      setMessage(result.message);
      router.refresh();
    });
  };

  if (isLoading) {
    return <Text color="fg.muted">Loading library status…</Text>;
  }

  if (loadFailed) {
    return (
      <Text color="red.500" role="alert">
        Your library status could not be loaded. Please try again later.
      </Text>
    );
  }

  return (
    <Grid gap={3} maxWidth={{ base: '100%', md: '22rem' }}>
      <Field.Root disabled={isPending}>
        <Field.Label>Library status</Field.Label>
        <NativeSelect.Root size="md">
          <NativeSelect.Field
            aria-label="TV show library status"
            onChange={(event) => {
              const nextStatus = event.target.value as TvLibrarySectionStatus;
              setSelectedStatus(nextStatus);

              if (status) {
                saveStatus(nextStatus);
              }
            }}
            value={selectedStatus}
          >
            {TV_LIBRARY_STATUSES.map((option) => (
              <option key={option} value={option}>
                {statusLabels[option]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      {status ? (
        <>
          <Badge alignSelf="start" colorPalette="gold" variant="subtle">
            Current status: {statusLabels[status]}
          </Badge>
          <Button
            alignSelf="start"
            loading={isPending}
            onClick={remove}
            type="button"
            variant="outline"
          >
            Remove from Library
          </Button>
        </>
      ) : (
        <Button
          alignSelf="start"
          loading={isPending}
          onClick={() => saveStatus(selectedStatus)}
          type="button"
        >
          Add to Library
        </Button>
      )}

      {message ? (
        <Text
          color={message.startsWith('We could not') ? 'red.500' : 'fg.muted'}
          fontSize="sm"
          role={message.startsWith('We could not') ? 'alert' : 'status'}
        >
          {message}
        </Text>
      ) : null}
    </Grid>
  );
};
