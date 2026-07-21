'use client';

import {
  Avatar,
  Button,
  Dialog,
  Field,
  Flex,
  Grid,
  Input,
  Skeleton,
  Text,
} from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/PosterImage';
import type { MovieCreditsResponse } from 'lib/services/tmdb/movie/credits/types';
import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';

type CastsWrapperProps = {
  isLoadingCredits?: boolean;
  credits?: MovieCreditsResponse;
};

const CastsWrapper = ({ isLoadingCredits, credits }: CastsWrapperProps) => {
  const [keyword, setKeyword] = useState<string>('');
  const hasCast = (credits?.cast.length ?? 0) > 0;

  const handleChangeKeyword = (event: ChangeEvent<HTMLInputElement>) =>
    setKeyword(event.target.value);

  const casts = useMemo(() => {
    if (credits) {
      return credits.cast
        .filter(
          (unfilteredCast) =>
            unfilteredCast.name.toLowerCase().indexOf(keyword.toLowerCase()) >
            -1
        )
        .map((movieCast) => (
          <Flex
            alignItems="center"
            asChild
            cursor="pointer"
            gridColumnGap={2}
            key={`${movieCast.name}-${movieCast.id}`}
          >
            <Link href={`/person/${movieCast.id}`} prefetch={false}>
              <Avatar.Root size="lg">
                <Avatar.Fallback name={movieCast.name} />
                {movieCast.profile_path ? (
                  <Avatar.Image src={`${IMAGE_URL}${movieCast.profile_path}`} />
                ) : null}
              </Avatar.Root>
              <Text>{movieCast.name}</Text>
            </Link>
          </Flex>
        ));
    }

    return [];
  }, [credits, keyword]);

  return (
    <Skeleton loading={!!isLoadingCredits}>
      <Dialog.Root placement="center" scrollBehavior="inside">
        {credits && hasCast ? (
          <Flex
            alignItems="center"
            gridGap={3}
            minHeight={24}
            overflowX="scroll"
          >
            <Dialog.Trigger asChild>
              <Button
                aria-label="Open full movie cast"
                borderRadius="50%"
                padding={8}
              >
                Cast
              </Button>
            </Dialog.Trigger>
            {credits.cast.slice(0, 20).map((movieCast) => (
              <Avatar.Root
                asChild
                cursor="pointer"
                key={`${movieCast.name}-${movieCast.id}`}
                size="lg"
              >
                <Link
                  aria-label={`Open ${movieCast.name} profile`}
                  href={`/person/${movieCast.id}`}
                >
                  <Avatar.Fallback name={movieCast.name} />
                  {movieCast.profile_path ? (
                    <Avatar.Image
                      src={`${IMAGE_URL}${movieCast.profile_path}`}
                    />
                  ) : null}
                </Link>
              </Avatar.Root>
            ))}
            <Dialog.Trigger asChild>
              <Button
                aria-label="Open more movie cast"
                borderRadius="50%"
                padding={8}
              >
                More
              </Button>
            </Dialog.Trigger>
          </Flex>
        ) : (
          <Text color="gray.400">
            No cast information is available from TMDB.
          </Text>
        )}

        <Dialog.Backdrop />

        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header flexDirection="column">
              <Dialog.Title>Casts</Dialog.Title>
              <Field.Root marginY={2}>
                <Input
                  aria-label="Search movie cast"
                  onChange={handleChangeKeyword}
                  placeholder="Search cast"
                  type="text"
                  value={keyword}
                />
              </Field.Root>
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              <Grid gap={4} templateColumns={['repeat(1, 1fr)']}>
                {casts}
              </Grid>
            </Dialog.Body>

            <Dialog.Footer />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Skeleton>
  );
};

export default CastsWrapper;
