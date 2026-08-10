import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed', // THIS IS THE CRITICAL FIX. 'ja' will not have a prefix.
  localeDetection: false
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)']
};

