process.env['NODE_ENV'] = 'test'
process.env['DATABASE_URL'] ??=
    'postgresql://postgres:postgres@localhost:5432/dwmc_api_test?schema=public'
process.env['SUPABASE_URL'] = 'https://test.supabase.co'
process.env['SUPABASE_ANON_KEY'] = 'test-anon-key'
