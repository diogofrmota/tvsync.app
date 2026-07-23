'use client';

import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { PageShell } from 'lib/components/shared/PageShell';
import Link from 'next/link';
import { useEffect } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell size="narrow">
      <Box
        borderColor="red.300"
        borderRadius="md"
        borderWidth="1px"
        padding={5}
      >
        <Heading as="h1" fontSize={{ base: 'xl', md: '2xl' }} marginBottom={3}>
          Something went wrong
        </Heading>
        <Text color="fg.muted" marginBottom={5}>
          This page hit an unexpected error. You can try again, or head back to
          the homepage.
          {error.digest ? ` (Error ${error.digest})` : null}
        </Text>
        <Box display="flex" gap={3}>
          <Button onClick={reset} variant="solid">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </Box>
      </Box>
    </PageShell>
  );
}
