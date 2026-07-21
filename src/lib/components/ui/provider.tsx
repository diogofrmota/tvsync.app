'use client';

import { ProgressProvider } from '@bprogress/next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { customTheme } from 'lib/styles/theme';
import { SessionProvider } from 'next-auth/react';

import { ColorModeProvider } from './color-mode';

export function Provider(props: React.PropsWithChildren) {
  return (
    <ProgressProvider color="#00aaaa" height="4px" shallowRouting>
      <SessionProvider>
        <ColorModeProvider defaultTheme="dark">
          <ChakraProvider value={customTheme}>{props.children}</ChakraProvider>
        </ColorModeProvider>
      </SessionProvider>
    </ProgressProvider>
  );
}
