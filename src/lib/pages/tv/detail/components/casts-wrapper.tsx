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
import type { TVCreditsResponse } from 'lib/services/tmdb/tv/credits/types';
import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';

type TvCastsWrapperProps = {
  credits?: TVCreditsResponse;
  isLoadingCredits?: boolean;
};

export const TvCastsWrapper = ({
  credits,
  isLoadingCredits,
}: TvCastsWrapperProps) => {
  const [keyword, setKeyword] = useState('');
  const hasCast = (credits?.cast.length ?? 0) > 0;

  const handleChangeKeyword = (event: ChangeEvent<HTMLInputElement>) =>
    setKeyword(event.target.value);

  const casts = useMemo(() => {
    if (!credits) {
      return [];
    }

    return credits.cast
      .filter((castMember) =>
        castMember.name.toLowerCase().includes(keyword.toLowerCase())
      )
      .map((castMember) => (
        <Flex
          alignItems="center"
          asChild
          cursor="pointer"
          gridColumnGap={2}
          key={`${castMember.name}-${castMember.id}`}
        >
          <Link href={`/person/${castMember.id}`} prefetch={false}>
            <Avatar.Root size="lg">
              <Avatar.Fallback name={castMember.name} />
              {castMember.profile_path ? (
                <Avatar.Image src={`${IMAGE_URL}${castMember.profile_path}`} />
              ) : null}
            </Avatar.Root>
            <Grid gap={0}>
              <Text>{castMember.name}</Text>
              {castMember.character ? (
                <Text color="gray.400" fontSize="sm">
                  {castMember.character}
                </Text>
              ) : null}
            </Grid>
          </Link>
        </Flex>
      ));
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
                aria-label="Open full TV show cast"
                borderRadius="50%"
                padding={8}
              >
                Cast
              </Button>
            </Dialog.Trigger>
            {credits.cast.slice(0, 20).map((castMember) => (
              <Avatar.Root
                asChild
                cursor="pointer"
                key={`${castMember.name}-${castMember.id}`}
                size="lg"
              >
                <Link
                  aria-label={`Open ${castMember.name} profile`}
                  href={`/person/${castMember.id}`}
                  prefetch={false}
                >
                  <Avatar.Fallback name={castMember.name} />
                  {castMember.profile_path ? (
                    <Avatar.Image
                      src={`${IMAGE_URL}${castMember.profile_path}`}
                    />
                  ) : null}
                </Link>
              </Avatar.Root>
            ))}
            <Dialog.Trigger asChild>
              <Button
                aria-label="Open more TV show cast"
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
              <Dialog.Title>Cast</Dialog.Title>
              <Field.Root marginY={2}>
                <Input
                  aria-label="Search TV show cast"
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
                {casts.length > 0 ? (
                  casts
                ) : (
                  <Text color="gray.400">No matching cast members found.</Text>
                )}
              </Grid>
            </Dialog.Body>

            <Dialog.Footer />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Skeleton>
  );
};
