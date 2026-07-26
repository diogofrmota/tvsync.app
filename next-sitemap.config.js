/** @type {import('next-sitemap').IConfig} */
const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    'https://tvsync.app'
).origin;

const NextSitemapConfig = {
  // Generated during postbuild on Vercel; local artifacts stay gitignored.
  siteUrl,
  generateRobotsTxt: true,
  // The admin dashboard is credential-gated and must never be listed or
  // crawled, so it stays out of both the sitemap and robots.txt.
  exclude: ['/admin'],
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/', disallow: ['/admin'] }],
  },
};

module.exports = NextSitemapConfig;
