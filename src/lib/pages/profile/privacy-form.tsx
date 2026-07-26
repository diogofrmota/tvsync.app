'use client';

import { Button, Checkbox, Stack, Text } from '@chakra-ui/react';
import { useActionState, useState } from 'react';

import {
  exportOwnPersonalDataFile,
  type PrivacyChoicesFormState,
  updateOwnPrivacyChoices,
} from './actions';

const initialState: PrivacyChoicesFormState = {};

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
 * The account's own privacy switch. TvSync has one optional use of personal
 * data — anonymous product analytics — so the GDPR right to object and the CCPA
 * right to opt out of sale/sharing are served by this single choice, saved
 * against the account rather than a cookie so it follows the user to every
 * device they sign in on.
 */
export const PrivacyChoicesForm = ({
  initialAnalyticsOptOut,
}: {
  initialAnalyticsOptOut: boolean;
}) => {
  const [state, formAction, isPending] = useActionState<
    PrivacyChoicesFormState,
    FormData
  >(updateOwnPrivacyChoices, initialState);
  const [analyticsOptOut, setAnalyticsOptOut] = useState(
    initialAnalyticsOptOut
  );

  return (
    <form action={formAction}>
      <fieldset
        disabled={isPending}
        style={{ border: 0, margin: 0, padding: 0 }}
      >
        <Stack gap={5}>
          <Feedback error={state.error} success={state.success} />
          <Checkbox.Root
            checked={analyticsOptOut}
            name="analyticsOptOut"
            onCheckedChange={(details) =>
              setAnalyticsOptOut(details.checked === true)
            }
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              Do not use my activity for usage analytics
            </Checkbox.Label>
          </Checkbox.Root>
          <Text color="fg.muted" fontSize="sm">
            TvSync never sells personal data and shows no third-party
            advertising. With this ticked, no analytics script loads while you
            are signed in. A browser that sends Global Privacy Control is
            honoured automatically, whether or not you are signed in.
          </Text>
          <Button loading={isPending} type="submit">
            Save Privacy Choices
          </Button>
        </Stack>
      </fieldset>
    </form>
  );
};

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
