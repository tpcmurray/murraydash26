export { default } from 'next-auth/middleware';

// Protect all admin routes
export const config = {
  matcher: ['/admin/:path*'],
};
