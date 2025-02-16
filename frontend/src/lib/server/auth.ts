import { PrismaAdapter } from "@auth/prisma-adapter"
import { SvelteKitAuth } from "@auth/sveltekit"
import { prisma } from "./prisma.ts"
import type { User } from "@prisma/client"

export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  providers: [], // Add required providers property
  session: {
    strategy: "jwt", 
    maxAge: 30 * 60, // 30 minutes
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // Cast user to include role property
        session.user = {
          ...session.user,
          role: token.role as User['role']
        };
      }
      return Promise.resolve(session);
    },
    jwt({ token, user }) {
      if (user) {
        // Cast user to User type to access role
        token.role = (user as User).role;
      }
      return Promise.resolve(token);
    }
  }
});
