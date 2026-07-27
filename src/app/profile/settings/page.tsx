import { Box, Flex, Heading, Image, Stack, Text } from '@chakra-ui/react';
import { PageShell } from 'lib/components/shared/PageShell';
import { LogoutButton } from 'lib/pages/auth/client-actions';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FiBell,
  FiChevronRight,
  FiHelpCircle,
  FiLock,
  FiMoon,
  FiUser,
  FiXCircle,
} from 'react-icons/fi';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'TvSync | Settings' };

const sections = [
  {
    title: 'Account',
    items: [
      {
        href: '/profile/edit#profile',
        icon: FiUser,
        label: 'Profile',
        detail: 'Display name, username, email, bio and profile poster',
      },
      {
        href: '/profile/edit#account',
        icon: FiXCircle,
        label: 'Account',
        detail: 'Password security and account deletion',
      },
      {
        href: '/profile/edit#privacy',
        icon: FiLock,
        label: 'Privacy',
        detail: 'Review privacy choices and download your data',
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        href: '/profile/edit#appearance',
        icon: FiMoon,
        label: 'Appearance',
        detail: 'Choose your theme',
      },
      {
        href: '/profile/edit#notifications',
        icon: FiBell,
        label: 'Notifications',
        detail: 'Choose what TvSync tells you about',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        href: '/contact',
        icon: FiHelpCircle,
        label: 'Contact Support',
        detail: 'Get help from TvSync',
      },
      {
        href: '/report-a-bug',
        icon: FiXCircle,
        label: 'Report a Bug',
        detail: 'Tell us about a problem',
      },
    ],
  },
] as const;

export default async function SettingsPage() {
  if (!(await getAuthSession())?.user?.id) {
    redirect('/login?callbackUrl=/profile/settings' as Route);
  }
  return (
    <PageShell size="narrow">
      <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
        Settings
      </Heading>
      {sections.map((section) => (
        <Stack gap={3} key={section.title}>
          <Heading as="h2" fontSize="lg">
            {section.title}
          </Heading>
          <Stack
            background="bg.surface"
            borderRadius="xl"
            gap={0}
            overflow="hidden"
          >
            {section.items.map((item) => (
              <Box
                _hover={{ background: 'whiteAlpha.100' }}
                asChild
                key={item.label}
              >
                <Link href={item.href as Route}>
                  <Flex align="center" gap={3} padding={4}>
                    <item.icon aria-hidden />
                    <Stack flex="1" gap={0}>
                      <Text fontWeight="600">{item.label}</Text>
                      <Text color="fg.muted" fontSize="sm">
                        {item.detail}
                      </Text>
                    </Stack>
                    <FiChevronRight aria-hidden />
                  </Flex>
                </Link>
              </Box>
            ))}
          </Stack>
        </Stack>
      ))}
      <LogoutButton />
      <Flex align="center" gap={3} justify="center" paddingY={5}>
        <Image alt="TMDB" height="1rem" src="/tmdb.svg" width="auto" />
        <Text color="fg.muted" fontSize="xs">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </Text>
      </Flex>
    </PageShell>
  );
}
