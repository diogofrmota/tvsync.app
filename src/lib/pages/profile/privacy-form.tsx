'use client';

import { Button, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';

import { exportOwnPersonalDataFile } from './actions';

const Feedback = ({ error, success }: { error?: string; success?: string }) => (
  <>
    {error ? (
      <Text color="red.500" fontWeight="medium" role="alert">
        {error}
      </Text>
    ) : null}
    {success ? (
      <Text color="green.500" fontWeight="medium" role="status">
        {success}
      </Text>
    ) : null}
  </>
);

/**
 * The access/portability request (GDPR Art. 15 and 20, CCPA right to know),
 * answered immediately in the product: the server builds the account's own rows
 * as JSON and the browser saves the file. Nothing is emailed and nothing is
 * stored, so the copy exists only where the user puts it.
 */
export const DownloadPersonalDataButton = () => {
  const [error, setError] = useState<string | undefined>();
  const [isPreparing, setIsPreparing] = useState(false);

  const download = async () => {
    setError(undefined);
    setIsPreparing(true);

    try {
      const result = await exportOwnPersonalDataFile();

      if (result.error || !result.json) {
        setError(result.error ?? 'Your data could not be prepared.');

        return;
      }

      const url = URL.createObjectURL(
        new Blob([result.json], { type: 'application/json' })
      );
      const link = document.createElement('a');

      link.download = result.filename ?? 'tvsync-data.json';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Your data could not be prepared. Please try again.');
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <Stack alignItems="flex-start" gap={3}>
      <Feedback error={error} />
      <Button
        _hover={{ background: 'gray.100', color: 'gray.900' }}
        background="white"
        color="gray.900"
        loading={isPreparing}
        onClick={download}
        type="button"
        variant="outline"
      >
        Download My Data
      </Button>
    </Stack>
  );
};
