'use client';

import { Button, Text } from '@chakra-ui/react';
import {
  followProfileAction,
  unfollowProfileAction,
} from 'lib/features/social/actions';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type FollowButtonProps = {
  callbackUrl?: string;
  initialIsFollowing: boolean;
  isAuthenticated?: boolean;
  isOwnProfile: boolean;
  username: string;
};

export const FollowButton = ({
  callbackUrl,
  initialIsFollowing,
  isAuthenticated = true,
  isOwnProfile,
  username,
}: FollowButtonProps) => {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isOwnProfile) {
    return null;
  }

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(callbackUrl ?? `/profile/${username}`)}`
      );
      return;
    }

    startTransition(async () => {
      const result = isFollowing
        ? await unfollowProfileAction(username)
        : await followProfileAction(username);

      if (result.error) {
        setMessage(result.error);
        return;
      }

      setIsFollowing(!isFollowing);
      setMessage(null);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        loading={isPending}
        onClick={handleClick}
        size="sm"
        variant={isFollowing ? 'outline' : 'solid'}
      >
        {isFollowing ? 'Unfollow' : 'Follow'}
      </Button>
      {message ? (
        <Text color="red.500" fontSize="sm" role="alert">
          {message}
        </Text>
      ) : null}
    </>
  );
};
