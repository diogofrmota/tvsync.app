'use client';

import {
  Button,
  Field,
  Grid,
  Input,
  NativeSelect,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { PrivacySetting } from 'lib/types';
import { useActionState } from 'react';

import { type ProfileFormState, updateOwnProfile } from './actions';

export type ProfileFormValues = {
  bio: string;
  displayName: string;
  email: string;
  name: string;
  privacySetting: PrivacySetting;
  username: string;
};

type ProfileFormProps = {
  disabled?: boolean;
  initialValues: ProfileFormValues;
};

const initialState: ProfileFormState = {};

export const ProfileForm = ({
  disabled = false,
  initialValues,
}: ProfileFormProps) => {
  const [state, formAction, isPending] = useActionState(
    updateOwnProfile,
    initialState
  );

  return (
    <form action={formAction}>
      <fieldset
        disabled={disabled}
        style={{ border: 0, margin: 0, padding: 0 }}
      >
        <Grid gap={5}>
          {state.error && (
            <Text color="red.500" fontWeight="medium" role="alert">
              {state.error}
            </Text>
          )}
          {state.success && (
            <Text
              aria-live="polite"
              color="green.500"
              fontWeight="medium"
              role="status"
            >
              {state.success}
            </Text>
          )}

          <Field.Root invalid={Boolean(state.fieldErrors?.name)} required>
            <Field.Label>Name</Field.Label>
            <Input
              autoComplete="name"
              defaultValue={initialValues.name}
              maxLength={80}
              name="name"
              type="text"
            />
            <Field.ErrorText>{state.fieldErrors?.name}</Field.ErrorText>
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
              Lowercase letters, numbers, and underscores only.
            </Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.username}</Field.ErrorText>
          </Field.Root>

          <Field.Root
            invalid={Boolean(state.fieldErrors?.displayName)}
            required
          >
            <Field.Label>Display name</Field.Label>
            <Input
              defaultValue={initialValues.displayName}
              maxLength={80}
              name="displayName"
              type="text"
            />
            <Field.ErrorText>{state.fieldErrors?.displayName}</Field.ErrorText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Email</Field.Label>
            <Input
              autoComplete="email"
              defaultValue={initialValues.email}
              name="email"
              readOnly
              type="email"
            />
            <Field.HelperText>
              Email comes from Google login and is not edited here.
            </Field.HelperText>
          </Field.Root>

          <Field.Root invalid={Boolean(state.fieldErrors?.bio)}>
            <Field.Label>Bio</Field.Label>
            <Textarea
              defaultValue={initialValues.bio}
              maxLength={280}
              name="bio"
              rows={4}
            />
            <Field.HelperText>Up to 280 characters.</Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.bio}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={Boolean(state.fieldErrors?.privacySetting)}>
            <Field.Label>Privacy setting</Field.Label>
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
              Public profiles can be shown in future social and review features.
            </Field.HelperText>
            <Field.ErrorText>
              {state.fieldErrors?.privacySetting}
            </Field.ErrorText>
          </Field.Root>

          <Button
            disabled={disabled}
            loading={isPending}
            type="submit"
            variant="solid"
          >
            Save profile
          </Button>
        </Grid>
      </fieldset>
    </form>
  );
};
