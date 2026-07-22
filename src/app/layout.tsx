import type { Metadata, Viewport } from 'next';
import { Outfit as FontBody } from 'next/font/google';
import Script from 'next/script';

import 'lib/styles/globals.css';
import { Provider } from 'lib/components/ui/provider';
import Layout from 'lib/layout';

const fontBody = FontBody({
  subsets: ['latin'],
  variable: '--font-body',
});
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const umamiScriptSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;
const appUrl = new URL(
  process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'https://tvsync.app'
);

export const metadata: Metadata = {
  title: 'TvSync',
  description: 'Discover movies and TV shows',
  manifest: '/manifest.json',
  icons: {
    icon: '/popcorn.png',
  },
  metadataBase: appUrl,
  openGraph: {
    url: appUrl.toString(),
    title: 'TvSync',
    description: 'Discover movies and TV shows',
    images: [
      {
        url: '/popcorn.png',
        alt: 'TvSync',
      },
    ],
    siteName: 'TvSync',
  },
  twitter: {
    card: 'summary_large_image',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TvSync',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
};

export const viewport: Viewport = {
  minimumScale: 1,
  initialScale: 1,
  themeColor: '#FFFFFF',
  width: 'device-width, shrink-to-fit=no, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={fontBody.className} lang="en" suppressHydrationWarning>
      <head />
      <body>
        <Provider>
          <Layout>{children}</Layout>
        </Provider>
        {umamiWebsiteId && umamiScriptSrc ? (
          <Script
            data-website-id={umamiWebsiteId}
            defer
            src={umamiScriptSrc}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
