import { PrismaAdapter } from "@auth/prisma-adapter"
import { CredentialsSignin, SvelteKitAuth } from "@auth/sveltekit"
import { prisma } from "$lib/server/prisma"
import CredentialsProvider from "@auth/core/providers/credentials"
import type { User } from "@prisma/client"
import { signInSchema } from "$lib/zod"
import { ZodError } from "zod"
import * as argon2 from "@node-rs/argon2"
import { env } from "$env/dynamic/private"
import { building } from "$app/environment"

if (!building && !env.AUTH_SECRET)
  throw new Error("AUTH_SECRET is not set");

class CustomError extends CredentialsSignin {
  code = "validation_error";
  constructor(message: string) {
    super(message);
  }
}

export const { handle, signIn, signOut } = SvelteKitAuth({
  secret: env.AUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      type: "credentials",
      async authorize(credentials) {
        try {
          const { email, password } = await signInSchema.parseAsync(credentials)

          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: email as string }
          })

          if (!user || !user.hashedPassword) {
            throw new CredentialsSignin("Invalid credentials")
          }

          // Verify password using argon2
          const validPassword = await argon2.verify(user.hashedPassword, password)
          if (!validPassword) throw new CredentialsSignin("Invalid credentials");

          // Return partial user data
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
          }
        } catch (error) {
          if (error instanceof ZodError) {
            throw new CustomError(error.message)
          }
          throw error
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },
  pages: {
    //signIn: '/login',
    //error: '/auth/error',
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        // Cast user to include role property
        session.user = {
          ...session.user,
          role: token.role as User['role']
        }
      }
      return session
    },
    jwt({ token, user }) {
      if (user) {
        // Cast user to User type to access role
        token.role = (user as User).role
      }
      return token
    }
  }
});
