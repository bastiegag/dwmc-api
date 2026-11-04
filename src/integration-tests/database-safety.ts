const TEST_DATABASE_NAME = 'dwmc_api_test'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

export type IntegrationDatabaseConfig = {
    databaseUrl: string | undefined
    integrationFlag: string | undefined
    nodeEnv: string | undefined
}

export const assertSafeIntegrationDatabase = ({
    databaseUrl,
    integrationFlag,
    nodeEnv,
}: IntegrationDatabaseConfig) => {
    if (integrationFlag !== '1') {
        throw new Error(
            'Integration database operations require DWMC_INTEGRATION_TEST=1. ' +
                'Set this flag only for the dedicated integration test command.',
        )
    }

    if (nodeEnv !== 'test') {
        throw new Error('Integration database operations require NODE_ENV=test.')
    }

    if (!databaseUrl) {
        throw new Error(
            `Integration tests require DATABASE_URL for the exact ${TEST_DATABASE_NAME} database.`,
        )
    }

    let parsed: URL
    try {
        parsed = new URL(databaseUrl)
    } catch {
        throw new Error('Integration DATABASE_URL must be a valid PostgreSQL connection URL.')
    }

    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
        throw new Error('Integration DATABASE_URL must use the postgres: or postgresql: protocol.')
    }

    if (!parsed.hostname || !LOCAL_HOSTNAMES.has(parsed.hostname)) {
        throw new Error(
            'Integration DATABASE_URL must target a local PostgreSQL host (localhost or loopback).',
        )
    }

    const databaseName = decodeDatabaseName(parsed.pathname)
    if (databaseName !== TEST_DATABASE_NAME) {
        throw new Error(
            `Integration DATABASE_URL must target the exact ${TEST_DATABASE_NAME} database.`,
        )
    }

    return parsed
}

const decodeDatabaseName = (pathname: string) => {
    if (!pathname.startsWith('/') || pathname.length <= 1) return null

    try {
        const databaseName = decodeURIComponent(pathname.slice(1))
        return databaseName && !databaseName.includes('/') ? databaseName : null
    } catch {
        return null
    }
}

export { TEST_DATABASE_NAME }
