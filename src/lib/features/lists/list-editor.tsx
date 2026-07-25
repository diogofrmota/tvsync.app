'use client';

import { Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react';
import { deleteCustomList, updateCustomList } from 'lib/features/lists/actions';
import {
  CUSTOM_LIST_DESCRIPTION_MAX_LENGTH,
  CUSTOM_LIST_NAME_MAX_LENGTH,
  type CustomListSummary,
} from 'lib/features/lists/types';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';

type Feedback = { message: string; tone: 'error' | 'success' };

/** Rename, describe, or delete one personalized list. */
export const CustomListEditor = ({ list }: { list: CustomListSummary }) => {
  const router = useRouter();
  const [description, setDescription] = useState(list.description);
  const [feedback, setFeedback] = useState<Feedback>();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [name, setName] = useState(list.name);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(undefined);

    startTransition(async () => {
      const result = await updateCustomList({
        description,
        listId: list.id,
        name,
      }).catch(() => ({
        listId: null,
        message: 'We could not update that list. Please try again.',
        status: 'error' as const,
      }));

      setFeedback({
        message: result.message,
        tone: result.status === 'saved' ? 'success' : 'error',
      });

      if (result.status === 'saved') {
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    setFeedback(undefined);
    startTransition(async () => {
      const result = await deleteCustomList({ listId: list.id }).catch(() => ({
        listId: null,
        message: 'We could not delete that list. Please try again.',
        status: 'error' as const,
      }));

      if (result.status === 'saved') {
        router.push('/profile/lists' as Route);
        router.refresh();
        return;
      }

      setIsConfirmingDelete(false);
      setFeedback({ message: result.message, tone: 'error' });
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        gap={4}
        padding={{ base: 4, md: 5 }}
      >
        <Field.Root required>
          <Field.Label fontSize="sm">List name</Field.Label>
          <Input
            maxLength={CUSTOM_LIST_NAME_MAX_LENGTH}
            name="name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label fontSize="sm">Description</Field.Label>
          <Input
            maxLength={CUSTOM_LIST_DESCRIPTION_MAX_LENGTH}
            name="description"
            onChange={(event) => setDescription(event.target.value)}
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
        <Flex gap={3} wrap="wrap">
          <Button
            disabled={isPending || !name.trim()}
            loading={isPending}
            type="submit"
          >
            Save List
          </Button>
          <Button
            borderColor="red.400"
            color="red.300"
            disabled={isPending}
            onClick={handleDelete}
            type="button"
            variant="outline"
          >
            {isConfirmingDelete ? 'Confirm Delete List' : 'Delete List'}
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};
