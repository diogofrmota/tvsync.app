'use client';

import { ClientOnly, Field, NativeSelect, Skeleton } from '@chakra-ui/react';
import { useColorMode } from 'lib/components/ui/color-mode';

export const ThemePreference = () => {
  const { colorMode, setColorMode } = useColorMode();

  return (
    <ClientOnly fallback={<Skeleton height="4.5rem" width="full" />}>
      <Field.Root>
        <Field.Label>Theme</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            aria-label="Theme preference"
            onChange={(event) =>
              setColorMode(event.currentTarget.value as typeof colorMode)
            }
            value={colorMode}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Field.HelperText>
          Dark mode is the default. Your choice is saved on this device.
        </Field.HelperText>
      </Field.Root>
    </ClientOnly>
  );
};
