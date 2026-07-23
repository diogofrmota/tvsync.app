'use client';

import { Badge, Button, Grid, HStack, Input, Text } from '@chakra-ui/react';
import {
  addReviewCommentAction,
  deleteReviewCommentAction,
  type SocialActionState,
  setReviewLikeAction,
} from 'lib/features/social/actions';
import type { ReviewSocialRow } from 'lib/services/database/social.server';
import type { MediaType } from 'lib/types';
import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';

type ReviewSocialProps = {
  mediaType: MediaType.Movie | MediaType.Tv;
  social: ReviewSocialRow | null;
  tmdbId: number;
};

const initialState: SocialActionState = {};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value)
  );

export const ReviewSocial = ({
  mediaType,
  social,
  tmdbId,
}: ReviewSocialProps) => {
  const [liked, setLiked] = useState(Boolean(social?.liked_by_current_user));
  const [likeCount, setLikeCount] = useState(social?.like_count ?? 0);
  const [isPending, startTransition] = useTransition();
  const [commentState, commentAction, isCommentPending] = useActionState(
    addReviewCommentAction,
    initialState
  );

  if (!social) {
    return null;
  }

  const handleLike = () => {
    startTransition(async () => {
      const nextLiked = !liked;
      const result = await setReviewLikeAction(
        social.review_id,
        nextLiked,
        tmdbId,
        mediaType
      );

      if (!result.error) {
        setLiked(nextLiked);
        setLikeCount((current) => current + (nextLiked ? 1 : -1));
      }
    });
  };

  return (
    <Grid gap={3}>
      <HStack flexWrap="wrap" gap={2}>
        <Button loading={isPending} onClick={handleLike} size="xs">
          {liked ? 'Unlike' : 'Like'}
        </Button>
        <Badge variant="subtle">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </Badge>
        <Badge variant="subtle">
          {social.comment_count}{' '}
          {social.comment_count === 1 ? 'comment' : 'comments'}
        </Badge>
      </HStack>

      {social.comments.length > 0 ? (
        <Grid gap={2}>
          {social.comments.map((comment) => (
            <Grid
              borderColor="whiteAlpha.200"
              borderRadius={6}
              borderWidth="1px"
              gap={1}
              key={comment.id}
              padding={3}
            >
              <HStack flexWrap="wrap" gap={2}>
                <Text asChild fontSize="sm" fontWeight="semibold">
                  <Link href={`/profile/${comment.username}`}>
                    {comment.display_name || comment.username}
                  </Link>
                </Text>
                <Text color="fg.muted" fontSize="xs">
                  {formatDate(comment.created_at)}
                </Text>
              </HStack>
              <Text fontSize="sm">{comment.body}</Text>
              {comment.can_delete ? (
                <Button
                  alignSelf="flex-start"
                  onClick={() =>
                    startTransition(() => {
                      deleteReviewCommentAction(
                        comment.id,
                        tmdbId,
                        mediaType
                      ).then(() => undefined);
                    })
                  }
                  size="xs"
                  variant="ghost"
                >
                  Delete
                </Button>
              ) : null}
            </Grid>
          ))}
        </Grid>
      ) : null}

      <form action={commentAction}>
        <Grid gap={2} templateColumns={{ base: '1fr', sm: '1fr auto' }}>
          <input name="reviewId" type="hidden" value={social.review_id} />
          <input name="tmdbId" type="hidden" value={tmdbId} />
          <input name="mediaType" type="hidden" value={mediaType} />
          <Input
            aria-label="Comment"
            name="body"
            placeholder="Add a comment"
            size="sm"
          />
          <Button loading={isCommentPending} size="sm" type="submit">
            Comment
          </Button>
        </Grid>
      </form>
      {commentState.error ? (
        <Text color="red.300" fontSize="sm">
          {commentState.error}
        </Text>
      ) : null}
    </Grid>
  );
};
