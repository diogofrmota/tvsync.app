'use client';

import { Box, Button, Field, Input, Stack, Textarea } from '@chakra-ui/react';
import { StatePanel } from 'lib/components/shared/Section';
import {
  type ContactFormState,
  submitContactMessage,
} from 'lib/features/contact/actions';
import { CONTACT_FIELD_LIMITS } from 'lib/services/contact/security';
import { useActionState, useRef } from 'react';

const initialState: ContactFormState = {};

export const ContactForm = () => {
  const [state, formAction, isPending] = useActionState(
    submitContactMessage,
    initialState
  );
  const renderedAtMsRef = useRef(Date.now());

  if (state.success) {
    return (
      <StatePanel
        message="Thanks for contacting TvSync. Your message has been sent."
        title="Message sent"
        tone="success"
      />
    );
  }

  return (
    <Stack asChild gap={5}>
      <form action={formAction}>
        <input
          name="renderedAt"
          type="hidden"
          value={renderedAtMsRef.current}
        />
        <Box
          aria-hidden="true"
          left="-9999px"
          position="absolute"
          top="-9999px"
        >
          <label htmlFor="company">Company</label>
          <input
            autoComplete="off"
            id="company"
            name="company"
            tabIndex={-1}
            type="text"
          />
        </Box>
        {state.error ? <StatePanel message={state.error} tone="error" /> : null}
        <fieldset
          disabled={isPending}
          style={{ border: 0, margin: 0, padding: 0 }}
        >
          <Stack gap={5}>
            <Field.Root invalid={Boolean(state.fieldErrors?.name)} required>
              <Field.Label>Name</Field.Label>
              <Input
                autoComplete="name"
                defaultValue={state.values?.name}
                maxLength={CONTACT_FIELD_LIMITS.name}
                name="name"
                required
              />
              <Field.ErrorText>{state.fieldErrors?.name}</Field.ErrorText>
            </Field.Root>
            <Field.Root invalid={Boolean(state.fieldErrors?.email)} required>
              <Field.Label>Email address</Field.Label>
              <Input
                autoComplete="email"
                defaultValue={state.values?.email}
                maxLength={CONTACT_FIELD_LIMITS.email}
                name="email"
                required
                type="email"
              />
              <Field.ErrorText>{state.fieldErrors?.email}</Field.ErrorText>
            </Field.Root>
            <Field.Root invalid={Boolean(state.fieldErrors?.subject)} required>
              <Field.Label>Subject</Field.Label>
              <Input
                defaultValue={state.values?.subject}
                maxLength={CONTACT_FIELD_LIMITS.subject}
                name="subject"
                required
              />
              <Field.ErrorText>{state.fieldErrors?.subject}</Field.ErrorText>
            </Field.Root>
            <Field.Root invalid={Boolean(state.fieldErrors?.message)} required>
              <Field.Label>Message</Field.Label>
              <Textarea
                maxLength={CONTACT_FIELD_LIMITS.message}
                minHeight="10rem"
                minLength={CONTACT_FIELD_LIMITS.messageMin}
                name="message"
                required
              />
              <Field.ErrorText>{state.fieldErrors?.message}</Field.ErrorText>
            </Field.Root>
            <Button alignSelf="flex-start" loading={isPending} type="submit">
              Send Message
            </Button>
          </Stack>
        </fieldset>
      </form>
    </Stack>
  );
};
