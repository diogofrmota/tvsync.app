import { Heading, Stack, Text } from '@chakra-ui/react';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import type { ReactNode } from 'react';

export const LegalPage = ({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) => (
  <PageShell size="narrow">
    <PageHeading subtitle={subtitle} title={title} />
    <Stack gap={7}>{children}</Stack>
  </PageShell>
);

export const LegalSection = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <Stack gap={2}>
    <Heading as="h2" fontSize="xl">
      {title}
    </Heading>
    <Text _dark={{ color: 'gray.100' }} color="gray.600">
      {children}
    </Text>
  </Stack>
);
