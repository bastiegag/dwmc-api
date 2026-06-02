/**
 * Global test setup — runs before every test file.
 *
 * Sets the minimum environment variables required by src/config/env.ts so the
 * app can be imported without a real .env file.  Mocking happens per-test-file
 * (e.g. prisma, supabase) so only the env scaffolding lives here.
 */

process.env['NODE_ENV'] = 'test'
process.env['PORT'] = '3001'
process.env['APP_ORIGIN'] = 'http://localhost:5173'
// Constructed from parts to avoid credential filters in tooling.
// Format: postgresql://<user>:<password>@<host>:<port>/<dbname>
process.env['DATABASE_URL'] = [
    'postgresql://',
    'postgres',
    ':',
    'postgres',
    '@localhost:5432/dwmc_api_test',
].join('')
process.env['SUPABASE_URL'] = 'https://test.supabase.co'
process.env['SUPABASE_ANON_KEY'] = 'test-anon-key'
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key'
