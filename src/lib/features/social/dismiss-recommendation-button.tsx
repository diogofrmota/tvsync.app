'use client';

import { Button } from '@chakra-ui/react';
import { dismissRecommendationAction } from 'lib/features/social/actions';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export const DismissRecommendationButton = ({ id }: { id: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      loading={isPending}
      onClick={() =>
        startTransition(async () => {
          await dismissRecommendationAction(id);
          router.refresh();
        })
      }
      size="sm"
      variant="ghost"
    >
      Dismiss
    </Button>
  );
};
