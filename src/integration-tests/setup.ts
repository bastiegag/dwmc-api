import { assertSafeIntegrationDatabase } from './database-safety.js'

assertSafeIntegrationDatabase({
    databaseUrl: process.env['DATABASE_URL'],
    integrationFlag: process.env['DWMC_INTEGRATION_TEST'],
    nodeEnv: process.env['NODE_ENV'],
})
process.env['SUPABASE_URL'] = 'https://test.supabase.co'
process.env['SUPABASE_ANON_KEY'] = 'test-anon-key'
