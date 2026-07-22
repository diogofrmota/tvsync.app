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
};

module.exports = NextSitemapConfig;
