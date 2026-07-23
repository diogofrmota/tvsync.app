'use client';

import { Stack } from '@chakra-ui/react';
import type { PageNavButtonProps } from 'lib/components/shared/list/page-nav-buttons';
import PageNavButtons from 'lib/components/shared/list/page-nav-buttons';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import TvShowListContainer from 'lib/components/tv/TvShowListContainer';
import { useTVShowByList } from 'lib/services/tmdb/tv/list/index.client';
import type {
  TVShowItem,
  TVShowListType,
} from 'lib/services/tmdb/tv/list/types';
import { useRouter, useSearchParams } from 'next/navigation';

type TVShowListPageProps = {
  listType: TVShowListType;
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const TVShowList = ({ listType }: TVShowListPageProps) => {
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const qPage = searchParams.get('page');
  const page = qPage && Number(qPage) > 0 ? Number(qPage) : 1;
  const includeAdult = searchParams.get('include_adult') ?? undefined;
  const sortBy = searchParams.get('sort_by') ?? undefined;
  const voteAverageGte = searchParams.get('vote_average.gte') ?? undefined;
  const voteCountGte = searchParams.get('vote_count.gte') ?? undefined;
  const withGenres = searchParams.get('with_genres') ?? undefined;

  const { data, isLoading } = useTVShowByList({
    listType,
    params: {
      include_adult: includeAdult,
      page,
      sort_by: sortBy,
      'vote_average.gte': voteAverageGte,
      'vote_count.gte': voteCountGte,
      with_genres: withGenres,
    },
  });

  const filterShows = (shows?: Array<TVShowItem>) => {
    const minVoteAverage = voteAverageGte ? Number(voteAverageGte) : undefined;
    const minVoteCount = voteCountGte ? Number(voteCountGte) : undefined;

    return shows?.filter((show) => {
      if (minVoteAverage && show.vote_average < minVoteAverage) {
        return false;
      }
      if (minVoteCount && show.vote_count < minVoteCount) {
        return false;
      }

      return true;
    });
  };

  const handleChangePage = (updatedPage: number) => {
    const updatedSearchParams = new URLSearchParams(searchParams.toString());
    updatedSearchParams.set('page', String(updatedPage));

    push(`/tv/${listType}?${updatedSearchParams.toString()}`);
  };

  const handleClickNext = () => {
    const updatedPage = page === data?.total_pages ? page : page + 1;
    handleChangePage(updatedPage);
  };
  const handleClickPrev = () => {
    const updatedPage = page === 1 ? page : page - 1;
    handleChangePage(updatedPage);
  };

  const pageNavButtonProps: PageNavButtonProps = {
    isLoading,
    page,
    totalPages: data?.total_pages ?? 0,
    onClickNext: handleClickNext,
    onClickPrev: handleClickPrev,
  };

  return (
    <PageShell>
      <PageHeading
        subtitle={capitalize(listType.replaceAll('_', ' '))}
        title="TV Shows"
      />
      <Stack gap={5}>
        <PageNavButtons {...pageNavButtonProps} />
        <TvShowListContainer
          isLoading={isLoading}
          shows={filterShows(data?.results)}
        />
        <PageNavButtons {...pageNavButtonProps} />
      </Stack>
    </PageShell>
  );
};

export default TVShowList;
