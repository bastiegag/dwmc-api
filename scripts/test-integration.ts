import { spawnSync } from 'node:child_process'
import {
    assertSafeIntegrationDatabase,
    TEST_DATABASE_NAME,
} from '../src/integration-tests/database-safety.js'

const databaseUrl = process.env['DATABASE_URL']
const integrationFlag = process.env['DWMC_INTEGRATION_TEST']
const nodeEnv = process.env['NODE_ENV']

const testDatabase = assertSafeIntegrationDatabase({
    databaseUrl,
    integrationFlag,
    nodeEnv,
})

const adminDatabaseUrl = new URL(testDatabase)
adminDatabaseUrl.pathname = '/postgres'

const { PrismaClient } = await import('@prisma/client')
const adminPrisma = new PrismaClient({
    datasources: { db: { url: adminDatabaseUrl.toString() } },
})

try {
    const result = await adminPrisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
            SELECT 1 FROM pg_database WHERE datname = ${TEST_DATABASE_NAME}
        ) AS exists
    `

    if (!result[0]?.exists) {
        await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${TEST_DATABASE_NAME}"`)
    }
} catch {
    throw new Error(
        `Could not verify or create ${TEST_DATABASE_NAME}. ` +
            'Ensure PostgreSQL is reachable and the configured role has CREATEDB permission.',
    )
} finally {
    await adminPrisma.$disconnect()
}

const environment = {
    ...process.env,
    DATABASE_URL: testDatabase.toString(),
    DWMC_INTEGRATION_TEST: integrationFlag,
    NODE_ENV: nodeEnv,
}
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
