import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { LogoutButton } from 'lib/pages/auth/client-actions';
import type { Route } from 'next';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  FiChevronRight,
  FiHelpCircle,
  FiLock,
  FiUser,
  FiXCircle,
} from 'react-icons/fi';

type SettingsItem = {
  detail: string;
  href: Route;
  icon: IconType;
  label: string;
};

/**
 * Every entry here opens a page of its own under `/profile/settings/*`. The
 * three account entries are the settings TvSync actually stores something for;
 * support entries hand off to the existing public routes.
 */
const sections: ReadonlyArray<{
  items: ReadonlyArray<SettingsItem>;
  title: string;
}> = [
  {
    items: [
      {
        detail: 'Avatar, display name, username, email and bio',
        href: '/profile/settings/profile' as Route,
        icon: FiUser,
        label: 'Profile',
      },
      {
        detail: 'Password security and account deletion',
        href: '/profile/settings/account' as Route,
        icon: FiXCircle,
        label: 'Account',
      },
      {
        detail: 'Review privacy choices and download your data',
        href: '/profile/settings/privacy' as Route,
        icon: FiLock,
        label: 'Privacy',
      },
    ],
    title: 'Account',
  },
  {
    items: [
      {
        detail: 'Get help from TvSync',
        href: '/contact' as Route,
        icon: FiHelpCircle,
        label: 'Contact Support',
      },
      {
        detail: 'Tell us about a problem',
        href: '/report-a-bug' as Route,
        icon: FiXCircle,
        label: 'Report a Bug',
      },
    ],
    title: 'Support',
  },
];

const BackButton = ({ href, label }: { href: Route; label: string }) => (
  <Button
    _hover={{ background: 'gray.100', color: 'gray.900' }}
    asChild
    background="white"
    color="gray.900"
    size="sm"
    variant="outline"
  >
    <Link href={href}>{label}</Link>
  </Button>
);

export const BackToProfileButton = () => (
  <BackButton href={'/profile' as Route} label="Back to Profile" />
);

export const BackToSettingsButton = () => (
  <BackButton href={'/profile/settings' as Route} label="Back to Settings" />
);

/** The shared frame every settings sub-page renders inside. */
export const SettingsSubPage = ({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  subtitle: string;
  title: string;
}) => (
  <PageShell size="narrow">
    <PageHeading
      actions={<BackToSettingsButton />}
      subtitle={subtitle}
      title={title}
    />
    {children}
  </PageShell>
);

/** One bordered block of related controls inside a settings sub-page. */
export const SettingsSection = ({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) => (
  <Stack
    borderColor="border"
    borderRadius="lg"
    borderWidth="1px"
    gap={5}
    padding={{ base: 5, md: 6 }}
  >
    <Stack gap={1}>
      <Heading as="h2" fontSize="xl">
        {title}
      </Heading>
      <Text color="fg.muted" fontSize="sm">
        {description}
      </Text>
    </Stack>
    {children}
  </Stack>
);

export const SettingsIndexPage = () => (
  <PageShell size="narrow">
    <PageHeading
      actions={<BackToProfileButton />}
      subtitle="Manage your account, privacy and support options."
      title="Settings"
    />
    {sections.map((section) => (
      <Stack gap={3} key={section.title}>
        <Heading as="h2" fontSize="lg">
          {section.title}
        </Heading>
        <Stack
          background="bg.surface"
          borderColor="border"
          borderRadius="xl"
          borderWidth="1px"
          gap={0}
          overflow="hidden"
        >
          {section.items.map((item) => (
            <Box
              _hover={{ background: 'whiteAlpha.100' }}
              asChild
              key={item.label}
            >
              <Link href={item.href}>
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
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </Text>
    </Flex>
  </PageShell>
);
