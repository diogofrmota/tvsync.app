'use client';

import {
  Button,
  Field,
  Grid,
  Input,
  NativeSelect,
  Text,
  Textarea,
} from '@chakra-ui/react';
import {
  type ReviewFormState,
  type ReviewView,
  saveReview,
} from 'lib/features/reviews/actions';
import { type MediaType, PrivacySetting } from 'lib/types';
import { useActionState, useEffect } from 'react';

type ReviewFormProps = {
  initialReview?: ReviewView | null;
  mediaType: MediaType.Movie | MediaType.Tv;
  onSaved?: () => void;
  tmdbId: number;
};

const initialState: ReviewFormState = {};

export const ReviewForm = ({
  initialReview,
  mediaType,
  onSaved,
  tmdbId,
}: ReviewFormProps) => {
  const [state, formAction, isPending] = useActionState(
    saveReview,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      onSaved?.();
    }
  }, [onSaved, state.success]);

  return (
    <form action={formAction}>
      <Grid gap={4}>
        <input name="tmdbId" type="hidden" value={tmdbId} />
        <input name="mediaType" type="hidden" value={mediaType} />

        {state.error ? (
          <Text color="red.500" fontWeight="medium">
            {state.error}
          </Text>
        ) : null}
        {state.success ? (
          <Text color="green.500" fontWeight="medium">
            {state.success}
          </Text>
        ) : null}

        <Field.Root invalid={Boolean(state.fieldErrors?.title)}>
          <Field.Label>Review title</Field.Label>
          <Input
            defaultValue={initialReview?.title ?? ''}
            maxLength={120}
            name="title"
            placeholder="Optional title"
          />
          <Field.ErrorText>{state.fieldErrors?.title}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(state.fieldErrors?.body)} required>
          <Field.Label>Your review</Field.Label>
          <Textarea
            defaultValue={initialReview?.body ?? ''}
            maxLength={2000}
            minLength={10}
            name="body"
            rows={5}
          />
          <Field.HelperText>10 to 2000 characters.</Field.HelperText>
          <Field.ErrorText>{state.fieldErrors?.body}</Field.ErrorText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Visibility</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              defaultValue={
                initialReview?.privacySetting ?? PrivacySetting.Public
              }
              name="privacySetting"
            >
              <option value={PrivacySetting.Public}>Public</option>
              <option value={PrivacySetting.Private}>Private</option>
              <option value={PrivacySetting.Friends}>Friends</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        <Button alignSelf="flex-start" loading={isPending} type="submit">
          {initialReview ? 'Update review' : 'Save review'}
        </Button>
      </Grid>
    </form>
  );
};
