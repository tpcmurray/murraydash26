import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';

// Allowed email domains (Terry and Nicole)
const ALLOWED_EMAILS = [
  'tpcmurray@gmail.com',
  'nicolelanamurray@gmail.com',
];

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow specific users
      if (user.email && ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        return true;
      }
      return false;
    },
    async session({ session, user }) {
      // Add user ID to session
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
session: {
    strategy: 'database',
  },
};
