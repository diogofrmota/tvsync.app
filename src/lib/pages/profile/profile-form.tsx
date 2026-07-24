'use client';

import {
  Button,
  CloseButton,
  Dialog,
  Field,
  Input,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useActionState, useEffect, useRef, useState } from 'react';

import {
  changeOwnPassword,
  checkUsernameAvailability,
  type DeleteAccountFormState,
  type PasswordFormState,
  type ProfileFormState,
  permanentlyDeleteOwnAccount,
  type UsernameAvailability,
  updateOwnProfile,
} from './actions';

export type ProfileFormValues = {
  bio: string;
  displayName: string;
  email: string;
  username: string;
};

const BIO_MAX_LENGTH = 100;

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

const usernameAvailabilityColor = (
  status: UsernameAvailability['status'] | 'checking' | 'idle'
) => {
  if (status === 'available') {
    return 'green.500';
  }

  if (status === 'checking') {
    return 'fg.muted';
  }

  return 'red.500';
};

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
  const [username, setUsername] = useState(initialValues.username);
  const [availability, setAvailability] = useState<
    UsernameAvailability | { status: 'checking' } | { status: 'idle' }
  >({ status: 'idle' });
  const latestUsernameRef = useRef(initialValues.username);

  useEffect(() => {
    latestUsernameRef.current = username;
    const normalized = username.normalize('NFKC').trim().toLowerCase();
    const currentUsername = initialValues.username
      .normalize('NFKC')
      .trim()
      .toLowerCase();

    if (!normalized || normalized === currentUsername) {
      setAvailability({ status: 'idle' });
      return;
    }

    setAvailability({ status: 'checking' });

    const handle = window.setTimeout(() => {
      checkUsernameAvailability(username).then((result) => {
        if (latestUsernameRef.current === username) {
          setAvailability(result);
        }
      });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [username, initialValues.username]);

  let availabilityMessage: string | undefined;

  if (availability.status === 'checking') {
    availabilityMessage = 'Checking availability…';
  } else if ('message' in availability) {
    availabilityMessage = availability.message;
  }

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
              maxLength={24}
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              pattern="[a-z0-9_]{3,24}"
              type="text"
              value={username}
            />
            <Field.HelperText>
              3-24 lowercase letters, numbers or underscores.
            </Field.HelperText>
            {availabilityMessage ? (
              <Text
                color={usernameAvailabilityColor(availability.status)}
                fontSize="sm"
                role="status"
              >
                {availabilityMessage}
              </Text>
            ) : null}
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
            <Field.Label>Bio</Field.Label>
            <Textarea
              defaultValue={initialValues.bio}
              maxLength={BIO_MAX_LENGTH}
              name="bio"
              rows={5}
            />
            <Field.HelperText>
              Up to {BIO_MAX_LENGTH} characters.
            </Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.bio}</Field.ErrorText>
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
          <Button
            _hover={{ background: 'gray.100', color: 'gray.900' }}
            background="white"
            color="gray.900"
            loading={isPending}
            type="submit"
            variant="outline"
          >
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
        <Button
          borderColor="red.400"
          color="red.400"
          colorPalette="red"
          variant="outline"
        >
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
              bg="red.600"
              color="white"
              colorPalette="red"
              form="delete-account-form"
              loading={isPending}
              type="submit"
            >
              Permanently Delete Account
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <CloseButton disabled={isPending} size="sm" />
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
