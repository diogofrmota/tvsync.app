/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-var */
import type { DefaultSession } from 'next-auth';

declare global {
  var umami: umami.umami;

  // eslint-disable-next-line @typescript-eslint/no-redeclare
  namespace umami {
    interface umami {
      track(payload: Record<string, string | number>): void;
      track(eventName: string, eventData?: Record<string, string | number>): void;
    }
  }
}

declare module 'next-auth' {
  interface User {
    authenticatedAt?: number;
    sessionVersion?: number;
  }

  interface Session {
    user?: DefaultSession['user'] & {
      authenticatedAt: number;
      id: string;
    };
  }
}

export {};
