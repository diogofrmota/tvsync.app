'use client';

import {
  AspectRatio,
  Box,
  Grid,
  Heading,
  Skeleton,
  Text,
} from '@chakra-ui/react';
import { BionifiedParagraph } from 'lib/components/BionifiedParagraph';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterImage from 'lib/components/shared/PosterImage';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import { usePersonDetail } from 'lib/services/tmdb/person/detail/index.client';
import { countAge } from 'lib/utils/count-age';

export const PersonDetailPage = ({ personId }: { personId: number }) => {
  const { data, isLoading } = usePersonDetail(personId);

  return (
    <PageShell>
      <Grid gap={8}>
        <BackButton />

        <Skeleton loading={isLoading}>
          <Box
            alignItems="start"
            display={{ base: 'grid', md: 'flex' }}
            gap={{ base: 8, md: 16 }}
          >
            {data && (
              <AspectRatio
                marginX={[8, '25%', 0]}
                minWidth={{ md: 300 }}
                ratio={3.6 / 5}
              >
                <PosterImage
                  alt={`${data.name} profile image`}
                  src={data.profile_path}
                />
              </AspectRatio>
            )}

            <Box>
              {data && (
                <Heading
                  fontWeight="extrabold"
                  letterSpacing={0}
                  marginX={[8, 8, 0]}
                  size="lg"
                  textAlign={['center', 'center', 'inherit']}
                  textTransform="uppercase"
                  wordBreak="break-word"
                >
                  {data.name}
                </Heading>
              )}

              {data && (
                <Grid gap={4}>
                  <Box
                    color="fg.muted"
                    fontSize="xs"
                    fontWeight="light"
                    letterSpacing={0}
                    marginY={2}
                    textTransform="uppercase"
                  >
                    {data.deathday ? (
                      <Text>
                        {data.deathday} (
                        {data.birthday
                          ? countAge(data.birthday, data.deathday)
                          : ''}{' '}
                        years)
                      </Text>
                    ) : (
                      data.birthday && (
                        <Text>Age : {countAge(data.birthday)} years</Text>
                      )
                    )}
                  </Box>
                  {data.biography ? (
                    <BionifiedParagraph
                      fontSize={{ base: 'sm', md: 'md' }}
                      lineHeight={1.75}
                    >
                      {data.biography}
                    </BionifiedParagraph>
                  ) : (
                    <Text color="fg.muted">
                      No biography is available from TMDB yet.
                    </Text>
                  )}
                </Grid>
              )}
            </Box>
          </Box>
        </Skeleton>
      </Grid>
    </PageShell>
  );
};
