import type { Session } from "@auth/core/types"

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth: () => Promise<Session | null>
		}
		interface PageData {
			session?: Session | null
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
