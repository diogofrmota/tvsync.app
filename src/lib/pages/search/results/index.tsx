'use client';

import { Button, Stack, Text } from '@chakra-ui/react';
import GridContainer from 'lib/components/shared/GridContainer';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionLoading, StatePanel } from 'lib/components/shared/Section';
import { useRequiredMediaLibrary } from 'lib/features/library/media-library-provider';
import { MediaSearchBar } from 'lib/pages/media/media-search-bar';
import {
  getSearchQuery,
  getSearchResultKey,
  type SearchLibraryItem,
} from 'lib/pages/search/search-state';
import { useSearchResults } from 'lib/pages/search/use-search-results';
import { MediaType } from 'lib/types';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const RESULT_SKELETON_COUNT = 18;

/**
 * Search is a single list: every movie and TV show related to the term, most
 * popular first. No content-type tabs, no genre filter, and no sort control —
 * the result grid is the page.
 */
export const SearchResultsPage = ({
  initialLibraryItems,
}: {
  initialLibraryItems: Array<SearchLibraryItem>;
}) => {
  const searchParams = useSearchParams();
  const query = getSearchQuery(searchParams.get('query'));
  // Library membership is shared with the poster quick actions, so a title
  // added with the yellow plus stays marked as added across the results.
  const { seedLibrary } = useRequiredMediaLibrary();
  const { isError, isLoading, items, retry } = useSearchResults(query);

  useEffect(
    () => seedLibrary(initialLibraryItems),
    [initialLibraryItems, seedLibrary]
  );

  const renderResults = () => {
    if (isError) {
      return (
        <StatePanel
          action={
            <Button onClick={retry} size="sm" variant="outline">
              Try again
            </Button>
          }
          message="Search is unavailable right now. Please try again shortly."
          title="Unable to load results"
          tone="error"
        />
      );
    }

    if (isLoading) {
      return (
        <Stack aria-label={`Loading results for ${query}`} role="status">
          <SectionLoading count={RESULT_SKELETON_COUNT} />
        </Stack>
      );
    }

    if (items.length === 0) {
      return (
        <StatePanel
          message="Try another movie or TV show title."
          title="No titles found"
        />
      );
    }

    return (
      <GridContainer>
        {items.map((item) => (
          <PosterCard
            id={item.id}
            imageUrl={item.posterPath}
            key={getSearchResultKey(item)}
            layout="grid"
            mediaType={item.mediaType}
            name={item.title}
            prefetch={false}
          />
        ))}
      </GridContainer>
    );
  };

  return (
    <PageShell>
      <PageHeading
        actions={
          <MediaSearchBar
            mediaType={MediaType.Movie}
            placeholder="Search movies and TV shows"
          />
        }
        title="Search"
      />
      {query ? (
        <Stack gap={5}>
          <Text aria-live="polite" color="fg.muted" fontSize="sm" role="status">
            Movies and TV shows related to “{query}”, most popular first.
          </Text>
          {renderResults()}
        </Stack>
      ) : (
        <StatePanel
          message="Enter a movie or TV show title to see related titles."
          title="Search TvSync"
        />
      )}
    </PageShell>
  );
};
