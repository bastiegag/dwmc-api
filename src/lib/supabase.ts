import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

/**
 * Backend Supabase client.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY for server-side operations such as validating
 * JWTs with supabase.auth.getUser(token).
 *
 * IMPORTANT: Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend — it
 * bypasses Row Level Security and grants full database access.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
