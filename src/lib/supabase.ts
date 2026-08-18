import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

/**
 * Backend Supabase client.
 *
 * Uses the project's publishable/anon key to validate access tokens with
 * supabase.auth.getUser(token). The backend uses Prisma for database access
 * and does not need a service-role credential.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
