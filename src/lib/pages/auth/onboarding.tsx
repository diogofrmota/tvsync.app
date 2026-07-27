'use client';

import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { ProductFeatures } from 'lib/components/shared/ProductFeatures';
import { completeOnboarding } from 'lib/pages/profile/actions';
import { useSession } from 'next-auth/react';
import { useActionState, useEffect, useState } from 'react';

export const Onboarding = () => {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(false);
  const [state, action, pending] = useActionState(completeOnboarding, {});
  const storageKey = session?.user?.id
    ? `tvsync:onboarding:${session.user.id}`
    : null;

  useEffect(() => {
    if (storageKey && localStorage.getItem(storageKey) !== 'complete') {
      setVisible(true);
    }
  }, [storageKey]);
  useEffect(() => {
    if (state.complete && storageKey) {
      localStorage.setItem(storageKey, 'complete');
      setVisible(false);
    }
  }, [state.complete, storageKey]);

  if (!visible) {
    return null;
  }
  return (
    <Flex
      align="center"
      background="rgba(0,0,0,.82)"
      inset={0}
      justify="center"
      padding={4}
      position="fixed"
      zIndex={100}
    >
      <Box
        background="bg"
        borderRadius="2xl"
        maxHeight="calc(100dvh - 2rem)"
        maxWidth="58rem"
        overflowY="auto"
        padding={{ base: 5, md: 8 }}
        width="full"
      >
        <Flex gap={2} marginBottom={7}>
          <Box
            background="gold.400"
            borderRadius="full"
            flex="1"
            height="3px"
          />
          <Box
            background={step === 2 ? 'gold.400' : 'border'}
            borderRadius="full"
            flex="1"
            height="3px"
          />
        </Flex>
        {step === 1 ? (
          <Stack gap={7}>
            <Heading textAlign="center">
              Welcome to Tv
              <Text as="span" color="gold.400">
                Sync
              </Text>
            </Heading>
            <ProductFeatures />
            <Button alignSelf="flex-end" onClick={() => setStep(2)}>
              Continue
            </Button>
          </Stack>
        ) : (
          <form action={action}>
            <Stack gap={5}>
              <Heading>Set up your profile</Heading>
              {state.error ? <Text color="red.400">{state.error}</Text> : null}
              <Field.Root
                invalid={Boolean(state.fieldErrors?.displayName)}
                required
              >
                <Field.Label>Name</Field.Label>
                <Input maxLength={80} name="displayName" required />
                <Field.ErrorText>
                  {state.fieldErrors?.displayName}
                </Field.ErrorText>
              </Field.Root>
              <Field.Root
                invalid={Boolean(state.fieldErrors?.username)}
                required
              >
                <Field.Label>Username</Field.Label>
                <Input
                  autoCapitalize="none"
                  maxLength={30}
                  name="username"
                  pattern="[A-Za-z0-9_-]{3,30}"
                  required
                />
                <Field.HelperText>
                  3-30 letters, numbers, underscores or hyphens.
                </Field.HelperText>
                <Field.ErrorText>{state.fieldErrors?.username}</Field.ErrorText>
              </Field.Root>
              <Flex gap={3} justify="space-between">
                <Button
                  onClick={() => setStep(1)}
                  type="button"
                  variant="outline"
                >
                  Back
                </Button>
                <Button loading={pending} type="submit">
                  Finish
                </Button>
              </Flex>
            </Stack>
          </form>
        )}
      </Box>
    </Flex>
  );
};
