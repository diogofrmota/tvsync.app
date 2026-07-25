'use client';

import { ProgressProvider } from '@bprogress/next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { MediaLibraryProvider } from 'lib/features/library/media-library-provider';
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
          <ChakraProvider value={customTheme}>
            {/* Poster quick actions share one library/favourite snapshot for
                every list on the page. */}
            <MediaLibraryProvider
              isAuthenticated={Boolean(props.session?.user)}
            >
              {props.children}
            </MediaLibraryProvider>
          </ChakraProvider>
        </ColorModeProvider>
      </SessionProvider>
    </ProgressProvider>
  );
}
