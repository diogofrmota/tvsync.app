import { Avatar, Flex, Grid, Heading, Skeleton, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';
import type { TVCreditsResponse } from 'lib/services/tmdb/tv/credits/types';
import Link from 'next/link';

type TvCastsWrapperProps = {
  credits?: TVCreditsResponse;
  isLoadingCredits?: boolean;
};

export const TvCastsWrapper = ({
  credits,
  isLoadingCredits,
}: TvCastsWrapperProps) => {
  const cast =
    credits?.cast.filter(
      (member) => member.id > 0 && member.name.trim().length > 0
    ) ?? [];
  const hasCast = cast.length > 0;

  return (
    <Skeleton asChild loading={!!isLoadingCredits}>
      <Grid as="section" gap={4}>
        <Heading fontSize={{ base: 'xl', md: '2xl' }}>Cast</Heading>
        {credits && hasCast ? (
          <Grid
            gap={4}
            templateColumns={{
              base: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
              xl: 'repeat(6, minmax(0, 1fr))',
            }}
          >
            {cast.slice(0, 12).map((tvCast) => (
              <Flex alignItems="center" asChild gap={3} key={tvCast.id}>
                <Link
                  aria-label={`View ${tvCast.name}`}
                  href={`/person/${tvCast.id}`}
                  prefetch={false}
                >
                  <Avatar.Root size="lg">
                    <Avatar.Fallback name={tvCast.name} />
                    {tvCast.profile_path ? (
                      <Avatar.Image
                        alt=""
                        src={`${IMAGE_URL}${tvCast.profile_path}`}
                      />
                    ) : null}
                  </Avatar.Root>
                  <Grid gap={0} minWidth={0}>
                    <Text fontWeight="600" lineClamp={2}>
                      {tvCast.name}
                    </Text>
                    {tvCast.character ? (
                      <Text color="fg.muted" fontSize="sm" lineClamp={2}>
                        {tvCast.character}
                      </Text>
                    ) : null}
                  </Grid>
                </Link>
              </Flex>
            ))}
          </Grid>
        ) : (
          <Text color="fg.muted">
            No cast information is available from TMDB.
          </Text>
        )}
      </Grid>
    </Skeleton>
  );
};
