'use client';

import { ProgressProvider } from '@bprogress/next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { customTheme } from 'lib/styles/theme';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

import { ColorModeProvider } from './color-mode';

export function Provider(
  props: React.PropsWithChildren<{ session?: Session | null }>
) {
  return (
    <ProgressProvider color="#fbbf24" height="4px" shallowRouting>
      <SessionProvider session={props.session}>
        <ColorModeProvider defaultTheme="dark" forcedTheme="dark">
          <ChakraProvider value={customTheme}>{props.children}</ChakraProvider>
        </ColorModeProvider>
      </SessionProvider>
    </ProgressProvider>
  );
}
