'use client';

import { Button, Field, Heading, Input, Stack, Text } from '@chakra-ui/react';
import {
  type AdminLoginState,
  signInToAdmin,
} from 'lib/features/admin/actions';
import { useActionState } from 'react';

const initialState: AdminLoginState = {};

export const AdminLoginForm = () => {
  const [state, formAction, isPending] = useActionState(
    signInToAdmin,
    initialState
  );

  return (
    <Stack
      background="bg.panel"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      gap={6}
      marginX="auto"
      maxWidth="26rem"
      padding={{ base: 6, md: 8 }}
      width="full"
    >
      <Stack gap={1}>
        <Heading as="h1" fontSize="2xl" fontWeight="600">
          TvSync Admin
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          Sign in with the dashboard credentials to manage TvSync.
        </Text>
      </Stack>
      {state.error ? (
        <Text
          aria-live="assertive"
          background="red.950"
          borderColor="red.500"
          borderRadius="md"
          borderWidth="1px"
          color="red.300"
          padding={3}
          role="alert"
        >
          {state.error}
        </Text>
      ) : null}
      <form action={formAction}>
        <fieldset
          disabled={isPending}
          style={{ border: 0, margin: 0, padding: 0 }}
        >
          <Stack gap={4}>
            <Field.Root required>
              <Field.Label>Username</Field.Label>
              <Input
                autoCapitalize="none"
                autoComplete="username"
                borderColor="white"
                maxLength={254}
                name="user"
                type="text"
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Password</Field.Label>
              <Input
                autoComplete="current-password"
                borderColor="white"
                maxLength={200}
                name="password"
                type="password"
              />
            </Field.Root>
            <Button loading={isPending} size="lg" type="submit">
              Enter dashboard
            </Button>
          </Stack>
        </fieldset>
      </form>
    </Stack>
  );
};
