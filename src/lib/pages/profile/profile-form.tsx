'use client';

import {
  Button,
  Dialog,
  Field,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { PrivacySetting } from 'lib/types';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useActionState, useEffect, useState } from 'react';

import {
  changeOwnPassword,
  type DeleteAccountFormState,
  type PasswordFormState,
  type ProfileFormState,
  permanentlyDeleteOwnAccount,
  updateOwnProfile,
} from './actions';

export type ProfileFormValues = {
  bio: string;
  displayName: string;
  email: string;
  privacySetting: PrivacySetting;
  username: string;
};

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

const GoogleReauthentication = () => (
  <Button
    onClick={() => signIn('google', { callbackUrl: '/profile/edit' })}
    type="button"
    variant="outline"
  >
    Reauthenticate with Google
  </Button>
);

export const ProfileForm = ({
  hasCredentials,
  initialValues,
}: {
  hasCredentials: boolean;
  initialValues: ProfileFormValues;
}) => {
  const [state, formAction, isPending] = useActionState<
    ProfileFormState,
    FormData
  >(updateOwnProfile, {});

  return (
    <form action={formAction}>
      <fieldset
        disabled={isPending}
        style={{ border: 0, margin: 0, padding: 0 }}
      >
        <Stack gap={5}>
          <Feedback error={state.error} success={state.success} />
          <Field.Root
            invalid={Boolean(state.fieldErrors?.displayName)}
            required
          >
            <Field.Label>Display name</Field.Label>
            <Input
              autoComplete="name"
              defaultValue={initialValues.displayName}
              maxLength={80}
              name="displayName"
              type="text"
            />
            <Field.ErrorText>{state.fieldErrors?.displayName}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={Boolean(state.fieldErrors?.username)} required>
            <Field.Label>Username</Field.Label>
            <Input
              autoCapitalize="none"
              autoComplete="username"
              defaultValue={initialValues.username}
              maxLength={24}
              name="username"
              pattern="[a-z0-9_]{3,24}"
              type="text"
            />
            <Field.HelperText>
              3-24 lowercase letters, numbers, or underscores.
            </Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.username}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={Boolean(state.fieldErrors?.email)} required>
            <Field.Label>Email</Field.Label>
            <Input
              autoCapitalize="none"
              autoComplete="email"
              defaultValue={initialValues.email}
              inputMode="email"
              maxLength={254}
              name="email"
              type="email"
            />
            <Field.HelperText>
              A new address becomes active only after you verify the link sent
              to it.
            </Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.email}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={Boolean(state.fieldErrors?.bio)}>
            <Field.Label>Biography</Field.Label>
            <Textarea
              defaultValue={initialValues.bio}
              maxLength={280}
              name="bio"
              rows={5}
            />
            <Field.HelperText>Up to 280 characters.</Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.bio}</Field.ErrorText>
          </Field.Root>

          <Field.Root
            invalid={Boolean(state.fieldErrors?.privacySetting)}
            required
          >
            <Field.Label>Profile visibility</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                defaultValue={initialValues.privacySetting}
                name="privacySetting"
              >
                <option value={PrivacySetting.Private}>Private</option>
                <option value={PrivacySetting.Friends}>Friends</option>
                <option value={PrivacySetting.Public}>Public</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Field.HelperText>
              Public profiles can be opened and followed by other users.
            </Field.HelperText>
            <Field.ErrorText>
              {state.fieldErrors?.privacySetting}
            </Field.ErrorText>
          </Field.Root>

          {hasCredentials ? (
            <Field.Root invalid={Boolean(state.fieldErrors?.currentPassword)}>
              <Field.Label>Current password</Field.Label>
              <Input
                autoComplete="current-password"
                maxLength={128}
                name="currentPassword"
                type="password"
              />
              <Field.HelperText>
                Required only when changing your email address.
              </Field.HelperText>
              <Field.ErrorText>
                {state.fieldErrors?.currentPassword}
              </Field.ErrorText>
            </Field.Root>
          ) : null}

          {!hasCredentials && state.error?.includes('Google again') ? (
            <GoogleReauthentication />
          ) : null}

          <Button loading={isPending} type="submit">
            Save Changes
          </Button>
        </Stack>
      </fieldset>
    </form>
  );
};

export const ChangePasswordForm = ({
  hasCredentials,
}: {
  hasCredentials: boolean;
}) => {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    PasswordFormState,
    FormData
  >(changeOwnPassword, {});

  useEffect(() => {
    if (!state.sessionInvalidated) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace('/login?account=password-updated');
      router.refresh();
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [router, state.sessionInvalidated]);

  return (
    <form action={formAction}>
      <fieldset
        disabled={isPending || state.sessionInvalidated}
        style={{ border: 0, margin: 0, padding: 0 }}
      >
        <Stack gap={5}>
          <Feedback error={state.error} success={state.success} />
          {hasCredentials ? (
            <Field.Root
              invalid={Boolean(state.fieldErrors?.currentPassword)}
              required
            >
              <Field.Label>Current password</Field.Label>
              <Input
                autoComplete="current-password"
                maxLength={128}
                name="currentPassword"
                type="password"
              />
              <Field.ErrorText>
                {state.fieldErrors?.currentPassword}
              </Field.ErrorText>
            </Field.Root>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              Your Google account does not have a TvSync password yet. Create
              one to enable email-and-password sign-in too.
            </Text>
          )}
          <Field.Root invalid={Boolean(state.fieldErrors?.password)} required>
            <Field.Label>New password</Field.Label>
            <Input
              autoComplete="new-password"
              maxLength={128}
              minLength={12}
              name="password"
              type="password"
            />
            <Field.HelperText>
              At least 12 characters with a letter and a number.
            </Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.password}</Field.ErrorText>
          </Field.Root>
          <Field.Root
            invalid={Boolean(state.fieldErrors?.confirmPassword)}
            required
          >
            <Field.Label>Confirm new password</Field.Label>
            <Input
              autoComplete="new-password"
              maxLength={128}
              minLength={12}
              name="confirmPassword"
              type="password"
            />
            <Field.ErrorText>
              {state.fieldErrors?.confirmPassword}
            </Field.ErrorText>
          </Field.Root>
          {!hasCredentials && state.error?.includes('Google again') ? (
            <GoogleReauthentication />
          ) : null}
          <Button loading={isPending} type="submit" variant="outline">
            {hasCredentials ? 'Change Password' : 'Create Password'}
          </Button>
        </Stack>
      </fieldset>
    </form>
  );
};

export const DeleteAccountDialog = ({
  hasCredentials,
  username,
}: {
  hasCredentials: boolean;
  username: string;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    DeleteAccountFormState,
    FormData
  >(permanentlyDeleteOwnAccount, {});

  useEffect(() => {
    if (!state.deleted) {
      return;
    }

    router.replace('/login?account=deleted');
    router.refresh();
  }, [router, state.deleted]);

  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      onOpenChange={(details) => setOpen(details.open)}
      open={open}
      placement="center"
      role="alertdialog"
    >
      <Dialog.Trigger asChild>
        <Button colorPalette="red" variant="outline">
          Delete Account
        </Button>
      </Dialog.Trigger>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Permanently delete your account?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <form action={formAction} id="delete-account-form">
              <fieldset
                disabled={isPending}
                style={{ border: 0, margin: 0, padding: 0 }}
              >
                <Stack gap={5}>
                  <Text>
                    This permanently deletes your profile, library, progress,
                    favourites, ratings, reviews, comments, provider links,
                    tokens, and social relationships. This action cannot be
                    undone.
                  </Text>
                  <Feedback error={state.error} />
                  <Field.Root
                    invalid={Boolean(state.fieldErrors?.confirmation)}
                    required
                  >
                    <Field.Label>Type {username} to confirm</Field.Label>
                    <Input
                      autoCapitalize="none"
                      autoComplete="off"
                      name="confirmation"
                      type="text"
                    />
                    <Field.ErrorText>
                      {state.fieldErrors?.confirmation}
                    </Field.ErrorText>
                  </Field.Root>
                  {hasCredentials ? (
                    <Field.Root
                      invalid={Boolean(state.fieldErrors?.currentPassword)}
                      required
                    >
                      <Field.Label>Current password</Field.Label>
                      <Input
                        autoComplete="current-password"
                        maxLength={128}
                        name="currentPassword"
                        type="password"
                      />
                      <Field.ErrorText>
                        {state.fieldErrors?.currentPassword}
                      </Field.ErrorText>
                    </Field.Root>
                  ) : null}
                  {!hasCredentials && state.error?.includes('Google again') ? (
                    <GoogleReauthentication />
                  ) : null}
                </Stack>
              </fieldset>
            </form>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button disabled={isPending} variant="outline">
                Cancel
              </Button>
            </Dialog.ActionTrigger>
            <Button
              colorPalette="red"
              form="delete-account-form"
              loading={isPending}
              type="submit"
            >
              Permanently Delete Account
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
