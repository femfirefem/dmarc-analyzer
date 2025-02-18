import { signIn } from '$lib/server/auth'
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types'

export const actions: Actions = { default: signIn }

// Redirect if authenticated
export const load = async ({ locals }) => {
  if (await locals.auth()) {
    throw redirect(303, '/');
  }
}