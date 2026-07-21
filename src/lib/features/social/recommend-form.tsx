'use client';

import { Button, Grid, NativeSelect, Text, Textarea } from '@chakra-ui/react';
import {
  getRecommendationRecipients,
  type RecommendationRecipient,
  recommendMediaAction,
  type SocialActionState,
} from 'lib/features/social/actions';
import type { MediaType } from 'lib/types';
import { useActionState, useEffect, useState } from 'react';

type RecommendFormProps = {
  mediaType: MediaType.Movie | MediaType.Tv;
  tmdbId: number;
};

const initialState: SocialActionState = {};

export const RecommendForm = ({ mediaType, tmdbId }: RecommendFormProps) => {
  const [recipients, setRecipients] = useState<Array<RecommendationRecipient>>(
    []
  );
  const [state, formAction, isPending] = useActionState(
    recommendMediaAction,
    initialState
  );

  useEffect(() => {
    let isMounted = true;

    getRecommendationRecipients().then((nextRecipients) => {
      if (isMounted) {
        setRecipients(nextRecipients);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (recipients.length === 0) {
    return (
      <Text color="gray.400" fontSize="sm">
        Follow public profiles to recommend this title to someone.
      </Text>
    );
  }

  return (
    <form action={formAction}>
      <Grid gap={3}>
        <input name="tmdbId" type="hidden" value={tmdbId} />
        <input name="mediaType" type="hidden" value={mediaType} />
        <NativeSelect.Root size="sm">
          <NativeSelect.Field name="receiverUserId">
            {recipients.map((recipient) => (
              <option key={recipient.userId} value={recipient.userId}>
                {recipient.displayName} (@{recipient.username})
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Textarea
          maxLength={500}
          name="note"
          placeholder="Add a short note"
          size="sm"
        />
        <Button loading={isPending} size="sm" type="submit">
          Recommend
        </Button>
        {state.error ? (
          <Text color="red.300" fontSize="sm">
            {state.error}
          </Text>
        ) : null}
        {state.success ? (
          <Text color="green.300" fontSize="sm">
            {state.success}
          </Text>
        ) : null}
      </Grid>
    </form>
  );
};
