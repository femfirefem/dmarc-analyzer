import { fail, redirect } from '@sveltejs/kit'
import { signIn } from '$lib/server/auth'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')

    if (!email || !password) {
      return fail(400, { error: 'Missing email or password' })
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    })

    if (!result?.ok) {
      return fail(400, { error: 'Invalid credentials' })
    }

    throw redirect(303, url.searchParams.get('redirectTo') || '/')
  }
}
