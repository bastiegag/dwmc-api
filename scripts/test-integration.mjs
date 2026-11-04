import { spawnSync } from 'node:child_process'

const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/dwmc_api_test?schema=public'

if (!databaseUrl.includes('_test')) {
    throw new Error('Integration tests require a dedicated DATABASE_URL containing "_test".')
}

const environment = { ...process.env, DATABASE_URL: databaseUrl }
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'

for (const args of [
    ['prisma', 'migrate', 'deploy'],
    ['vitest', 'run', '--config', 'vitest.integration.config.ts'],
]) {
    const result = spawnSync(command, args, {
        env: environment,
        stdio: 'inherit',
    })
    if (result.status !== 0) process.exit(result.status ?? 1)
}
