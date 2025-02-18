import type { Session } from "@auth/core/types"
import type { UserRole } from "@prisma/client"

declare module "@auth/core/types" {
	interface Session {
		user?: {
			id?: string
			email?: string | null
			name?: string | null
			image?: string | null
			role?: UserRole
		}
	}
}

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
		interface Platform {
			env: {
				PRIVATE_AUTH_SECRET: string
			}
		}
	}
}

export {};
