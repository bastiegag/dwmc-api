import { prisma } from '../../db/prisma.js'
import type { AuthUser } from '../../types/app.js'

/**
 * Returns the UserProfile for the given Supabase user, creating or updating it
 * if necessary.
 *
 * This is the canonical way to sync a Supabase Auth user with the local database.
 * All future business data (transactions, budgets, etc.) will be scoped to the
 * UserProfile via its `id` field.
 */
export async function getOrCreateUserProfile(authUser: AuthUser) {
  const profile = await prisma.userProfile.upsert({
    where: { authUserId: authUser.id },
    update: { email: authUser.email },
    create: {
      authUserId: authUser.id,
      email: authUser.email,
    },
  })

  return profile
}
