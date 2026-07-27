'use client';

import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  Portal,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { ProfileAvatarImage } from 'lib/components/profile/ProfileAvatarImage';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';
import { getSearchResultKey } from 'lib/pages/search/search-state';
import { useSearchResults } from 'lib/pages/search/use-search-results';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { updateOwnProfileAvatarSelection } from './actions';

/** Search fires this long after the last keystroke. */
const SEARCH_DEBOUNCE_MS = 400;
/** One screen of poster choices is enough to pick an avatar from. */
const VISIBLE_RESULT_COUNT = 18;

type AvatarSelection = { posterPath: string; title: string };

const ResultPoster = ({
  isSelected,
  onSelect,
  posterPath,
  title,
}: {
  isSelected: boolean;
  onSelect: () => void;
  posterPath: string;
  title: string;
}) => (
  <Box
    asChild
    aspectRatio={2 / 3}
    backgroundImage={`url(${IMAGE_URL}${posterPath})`}
    backgroundPosition="center"
    backgroundSize="cover"
    borderColor={isSelected ? 'gold.400' : 'border'}
    borderRadius="md"
    borderWidth="2px"
    width="full"
  >
    <button
      aria-label={`Use the ${title} poster as your avatar`}
      aria-pressed={isSelected}
      onClick={onSelect}
      type="button"
    />
  </Box>
);

/**
 * The avatar is picked from a title, so the picker is a search: type a show or
 * film, choose its poster, save. Nothing is uploaded — the saved value is the
 * TMDB poster path plus the title it belongs to.
 */
export const ProfileAvatarPicker = ({
  avatarPath,
  avatarTitle,
  displayName,
}: {
  avatarPath: string | null;
  avatarTitle: string | null;
  displayName: string;
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<AvatarSelection | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, startSaving] = useTransition();
  const { isError, isLoading, items } = useSearchResults(query);

  useEffect(() => {
    const handle = window.setTimeout(
      () => setQuery(term.trim()),
      SEARCH_DEBOUNCE_MS
    );

    return () => window.clearTimeout(handle);
  }, [term]);

  const save = (next: AvatarSelection) => {
    setError(undefined);
    startSaving(async () => {
      const result = await updateOwnProfileAvatarSelection(next);

      if (result.error) {
        setError(result.error);

        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  };

  const results = items
    .filter((item) => item.posterPath)
    .slice(0, VISIBLE_RESULT_COUNT);

  return (
    <Dialog.Root
      lazyMount
      onOpenChange={(details) => {
        setIsOpen(details.open);

        if (!details.open) {
          setError(undefined);
          setSelection(null);
        }
      }}
      open={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="lg"
    >
      <Dialog.Trigger asChild>
        <Box asChild borderRadius="full" className="group" position="relative">
          <button aria-label="Change your profile avatar" type="button">
            <ProfileAvatarImage
              avatarPath={avatarPath}
              avatarTitle={avatarTitle}
              displayName={displayName}
            />
            <Flex
              _groupHover={{ opacity: 1 }}
              align="center"
              background="blackAlpha.700"
              borderRadius="full"
              bottom={0}
              color="white"
              fontSize="xs"
              fontWeight="600"
              justify="center"
              left={0}
              opacity={0}
              position="absolute"
              right={0}
              top={0}
              transitionDuration="fast"
              transitionProperty="opacity"
              transitionTimingFunction="ease-out"
            >
              Change
            </Flex>
          </button>
        </Box>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Choose your avatar</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Text color="fg.muted" fontSize="sm">
                  Search for any show or film and pick its poster.
                </Text>
                <Input
                  autoComplete="off"
                  maxLength={120}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Search shows and films"
                  value={term}
                />
                {error ? (
                  <Text color="red.500" fontWeight="medium" role="alert">
                    {error}
                  </Text>
                ) : null}
                {isError ? (
                  <Text color="red.500" role="alert">
                    Search is unavailable right now. Please try again shortly.
                  </Text>
                ) : null}
                {isLoading ? (
                  <Flex justify="center" paddingY={6}>
                    <Spinner />
                  </Flex>
                ) : null}
                {!(isLoading || isError) && query && results.length === 0 ? (
                  <Text color="fg.muted">
                    No titles match “{query}”. Try another search.
                  </Text>
                ) : null}
                <Box
                  display="grid"
                  gap={3}
                  gridTemplateColumns={{
                    base: 'repeat(3, minmax(0, 1fr))',
                    md: 'repeat(6, minmax(0, 1fr))',
                  }}
                >
                  {results.map((item) => (
                    <ResultPoster
                      isSelected={selection?.posterPath === item.posterPath}
                      key={getSearchResultKey(item)}
                      onSelect={() =>
                        setSelection({
                          posterPath: item.posterPath ?? '',
                          title: item.title,
                        })
                      }
                      posterPath={item.posterPath ?? ''}
                      title={item.title}
                    />
                  ))}
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              {avatarPath ? (
                <Button
                  disabled={isSaving}
                  marginRight="auto"
                  onClick={() => save({ posterPath: '', title: '' })}
                  variant="ghost"
                >
                  Remove avatar
                </Button>
              ) : null}
              <Dialog.ActionTrigger asChild>
                <Button disabled={isSaving} variant="outline">
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                disabled={!selection}
                loading={isSaving}
                onClick={() => selection && save(selection)}
              >
                Save Avatar
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton disabled={isSaving} size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
