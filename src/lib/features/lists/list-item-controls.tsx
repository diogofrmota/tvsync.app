'use client';

import {
  Button,
  Field,
  Flex,
  NativeSelect,
  Stack,
  Text,
} from '@chakra-ui/react';
import type { MediaCardEntry } from 'lib/components/shared/media-item';
import { getMediaLibraryKey } from 'lib/features/library/media-library-keys';
import {
  addTitleToCustomList,
  removeTitleFromCustomList,
} from 'lib/features/lists/actions';
import { MediaType, type TrackableMediaType } from 'lib/types';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';

type Feedback = { message: string; tone: 'error' | 'success' };

const parseOptionValue = (value: string) => {
  const [mediaType, tmdbId] = value.split(':');

  if (mediaType !== MediaType.Movie && mediaType !== MediaType.Tv) {
    return null;
  }

  const parsedId = Number(tmdbId);

  return Number.isInteger(parsedId) && parsedId > 0
    ? { mediaType: mediaType as TrackableMediaType, tmdbId: parsedId }
    : null;
};

/**
 * Titles are added to a personalized list from the user's own library, so the
 * control needs no extra TMDB search surface.
 */
export const AddLibraryTitleToListForm = ({
  listId,
  options,
}: {
  listId: string;
  options: Array<MediaCardEntry>;
}) => {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>();
  const [selectedValue, setSelectedValue] = useState('');
  const [isPending, startTransition] = useTransition();

  if (options.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        Add movies and TV shows to your library first, then save them here.
      </Text>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseOptionValue(selectedValue);
    setFeedback(undefined);

    if (!parsed) {
      setFeedback({ message: 'Choose a title to add.', tone: 'error' });
      return;
    }

    startTransition(async () => {
      const result = await addTitleToCustomList({ listId, ...parsed }).catch(
        () => ({
          listId: null,
          message: 'We could not add that title. Please try again.',
          status: 'error' as const,
        })
      );

      setFeedback({
        message: result.message,
        tone: result.status === 'saved' ? 'success' : 'error',
      });

      if (result.status === 'saved') {
        setSelectedValue('');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={3}>
        <Flex align="flex-end" gap={3} wrap="wrap">
          <Field.Root flex="1" minWidth="14rem">
            <Field.Label fontSize="sm">Add from your library</Field.Label>
            <NativeSelect.Root size="sm">
              <NativeSelect.Field
                aria-label="Library title to add"
                onChange={(event) => setSelectedValue(event.target.value)}
                value={selectedValue}
              >
                <option value="">Select a title</option>
                {options.map((option) => (
                  <option
                    key={getMediaLibraryKey({
                      mediaType: option.mediaType,
                      tmdbId: option.id,
                    })}
                    value={`${option.mediaType}:${option.id}`}
                  >
                    {option.title}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Button
            disabled={isPending || !selectedValue}
            loading={isPending}
            size="sm"
            type="submit"
          >
            Add to List
          </Button>
        </Flex>
        {feedback ? (
          <Text
            color={feedback.tone === 'error' ? 'red.400' : 'fg.muted'}
            fontSize="sm"
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </Text>
        ) : null}
      </Stack>
    </form>
  );
};

export const RemoveListItemButton = ({
  listId,
  mediaType,
  title,
  tmdbId,
}: {
  listId: string;
  mediaType: TrackableMediaType;
  title: string;
  tmdbId: number;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await removeTitleFromCustomList({
        listId,
        mediaType,
        tmdbId,
      }).catch(() => ({ status: 'error' as const }));

      if (result.status === 'saved') {
        router.refresh();
      }
    });
  };

  return (
    <Button
      aria-label={`Remove ${title} from this list`}
      disabled={isPending}
      loading={isPending}
      onClick={handleClick}
      size="xs"
      type="button"
      variant="outline"
      width="full"
    >
      Remove
    </Button>
  );
};
