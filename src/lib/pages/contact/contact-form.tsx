'use client';

import { Button, Field, Input, Stack, Textarea } from '@chakra-ui/react';
import { StatePanel } from 'lib/components/shared/Section';
import { useState } from 'react';

export const ContactForm = () => {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  if (sent) {
    return (
      <StatePanel
        message="Thanks for contacting TvSync. Your message has been recorded."
        title="Message sent"
        tone="success"
      />
    );
  }
  return (
    <Stack asChild gap={5}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) {
            return;
          }
          setPending(true);
          window.setTimeout(() => {
            setPending(false);
            setSent(true);
          }, 300);
        }}
      >
        <Field.Root required>
          <Field.Label>Name</Field.Label>
          <Input autoComplete="name" name="name" required />
        </Field.Root>
        <Field.Root required>
          <Field.Label>Email address</Field.Label>
          <Input autoComplete="email" name="email" required type="email" />
        </Field.Root>
        <Field.Root required>
          <Field.Label>Subject</Field.Label>
          <Input name="subject" required />
        </Field.Root>
        <Field.Root required>
          <Field.Label>Message</Field.Label>
          <Textarea minHeight="10rem" name="message" required />
        </Field.Root>
        <Button
          alignSelf="flex-start"
          disabled={pending}
          loading={pending}
          type="submit"
        >
          Send Message
        </Button>
      </form>
    </Stack>
  );
};
