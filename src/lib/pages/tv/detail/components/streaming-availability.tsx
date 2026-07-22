import { Box, Flex, Heading, Image, Link, Stack, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/PosterImage';
import type {
  TvWatchProvider,
  TvWatchProviderRegion,
} from 'lib/services/tmdb/tv/providers/types';

const ProviderList = ({
  label,
  providers,
}: {
  label: string;
  providers: Array<TvWatchProvider>;
}) => {
  if (providers.length === 0) {
    return null;
  }

  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="600">
        {label}
      </Text>
      <Flex gap={3} wrap="wrap">
        {providers.map((provider) => (
          <Flex
            alignItems="center"
            borderWidth="1px"
            gap={2}
            key={provider.providerId}
            padding={2}
          >
            {provider.logoPath ? (
              <Image
                alt=""
                borderRadius="sm"
                boxSize="2rem"
                src={`${IMAGE_URL}${provider.logoPath}`}
              />
            ) : null}
            <Text fontSize="sm">{provider.providerName}</Text>
          </Flex>
        ))}
      </Flex>
    </Stack>
  );
};

export const TvStreamingAvailability = ({
  providers,
  region,
}: {
  providers: TvWatchProviderRegion | null;
  region: string;
}) => {
  const hasProviders = Boolean(
    providers &&
      (providers.flatrate.length > 0 ||
        providers.free.length > 0 ||
        providers.ads.length > 0 ||
        providers.rent.length > 0 ||
        providers.buy.length > 0)
  );

  return (
    <Box as="section">
      <Heading fontSize={{ base: 'xl', md: '2xl' }} marginBottom={2}>
        Streaming availability
      </Heading>
      <Text color="fg.muted" fontSize="sm" marginBottom={4}>
        Availability for region {region}. Provider data is supplied by JustWatch
        via TMDB and can change.
      </Text>
      {providers && hasProviders ? (
        <Stack gap={5}>
          <ProviderList label="Stream" providers={providers.flatrate} />
          <ProviderList label="Free" providers={providers.free} />
          <ProviderList label="With ads" providers={providers.ads} />
          <ProviderList label="Rent" providers={providers.rent} />
          <ProviderList label="Buy" providers={providers.buy} />
          {providers.link ? (
            <Link
              alignSelf="flex-start"
              href={providers.link}
              rel="noopener noreferrer"
              target="_blank"
            >
              Check current availability on TMDB
            </Link>
          ) : null}
        </Stack>
      ) : (
        <Text color="fg.muted">
          No streaming availability is listed for this region.
        </Text>
      )}
    </Box>
  );
};
