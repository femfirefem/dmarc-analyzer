import { fail, redirect } from '@sveltejs/kit';
import { registerSchema } from '$lib/zod';
import { prisma } from '$lib/server/prisma';
import * as argon2 from '@node-rs/argon2';
import type { Actions } from './$types';
import { ZodError } from 'zod';

async function validateRegistrationData(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  try {
    return await registerSchema.parseAsync({ email, password, confirmPassword });
  } catch (error) {
    if (error instanceof ZodError)
      throw fail(400, { error: (error as ZodError).message });
    throw error;
  }
}

export const actions: Actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    const { email, password } = await validateRegistrationData(formData);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return fail(400, { error: 'User already exists' });
    }

    // Hash password and create user
    const hashedPassword = await argon2.hash(password);
    
    await prisma.user.create({
      data: {
        email: email?.toString() ?? '',
        hashedPassword: hashedPassword,
        role: 'USER'
      }
    });
    
    // TODO: Send email verification email
    // await sendEmailVerificationEmail(email?.toString() ?? '', user.id);
    
    return { success: true };
  }
};
