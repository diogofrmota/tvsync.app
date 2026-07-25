'use client';

import { Button, Field, Input, Stack, Text } from '@chakra-ui/react';
import { createCustomList } from 'lib/features/lists/actions';
import {
  CUSTOM_LIST_DESCRIPTION_MAX_LENGTH,
  CUSTOM_LIST_NAME_MAX_LENGTH,
} from 'lib/features/lists/types';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';

type Feedback = { message: string; tone: 'error' | 'success' };

/**
 * Creating a personalized list is a two-field form so it can sit inline on the
 * profile and on the lists page without a modal.
 */
export const CreateCustomListForm = () => {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<Feedback>();
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(undefined);

    startTransition(async () => {
      const result = await createCustomList({ description, name }).catch(
        () => ({
          listId: null,
          message: 'We could not create that list. Please try again.',
          status: 'error' as const,
        })
      );

      if (result.status === 'saved') {
        setDescription('');
        setName('');
        setFeedback({ message: result.message, tone: 'success' });
        router.refresh();
        return;
      }

      setFeedback({ message: result.message, tone: 'error' });
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        direction={{ base: 'column', md: 'row' }}
        gap={3}
        padding={{ base: 4, md: 5 }}
      >
        <Stack flex="1" gap={3} minWidth={0}>
          <Field.Root required>
            <Field.Label fontSize="sm">List name</Field.Label>
            <Input
              maxLength={CUSTOM_LIST_NAME_MAX_LENGTH}
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Comfort rewatches"
              value={name}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label fontSize="sm">Description (optional)</Field.Label>
            <Input
              maxLength={CUSTOM_LIST_DESCRIPTION_MAX_LENGTH}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What belongs in this list?"
              value={description}
            />
          </Field.Root>
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
        <Button
          alignSelf={{ base: 'stretch', md: 'flex-start' }}
          disabled={isPending || !name.trim()}
          loading={isPending}
          type="submit"
        >
          Create List
        </Button>
      </Stack>
    </form>
  );
};
