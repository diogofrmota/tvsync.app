'use client';

import { Button, Text } from '@chakra-ui/react';
import {
  followProfileAction,
  unfollowProfileAction,
} from 'lib/features/social/actions';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type FollowButtonProps = {
  initialIsFollowing: boolean;
  isOwnProfile: boolean;
  profileUserId: string;
  username: string;
};

export const FollowButton = ({
  initialIsFollowing,
  isOwnProfile,
  profileUserId,
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
    startTransition(async () => {
      const result = isFollowing
        ? await unfollowProfileAction(profileUserId, username)
        : await followProfileAction(profileUserId, username);

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
        <Text color="red.300" fontSize="sm">
          {message}
        </Text>
      ) : null}
    </>
  );
};
