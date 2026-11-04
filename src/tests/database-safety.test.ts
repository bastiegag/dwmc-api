import { describe, expect, it } from 'vitest'
import {
    assertSafeIntegrationDatabase,
    TEST_DATABASE_NAME,
} from '../integration-tests/database-safety.js'

const validConfig = {
    databaseUrl: `postgresql://postgres:postgres@localhost:5432/${TEST_DATABASE_NAME}?schema=public`,
    integrationFlag: '1',
    nodeEnv: 'test',
}

describe('integration database safety', () => {
    it('accepts the exact local test database configuration', () => {
        expect(() => assertSafeIntegrationDatabase(validConfig)).not.toThrow()
    })

    it.each([
        ['development database', validConfig.databaseUrl.replace(TEST_DATABASE_NAME, 'dwmc_api')],
        [
            'similar database name',
            validConfig.databaseUrl.replace(TEST_DATABASE_NAME, 'dwmc_api_test_backup'),
        ],
        ['missing database name', 'postgresql://postgres:postgres@localhost:5432/'],
        ['malformed URL', 'not-a-database-url'],
        ['invalid protocol', validConfig.databaseUrl.replace('postgresql:', 'mysql:')],
        ['remote host', validConfig.databaseUrl.replace('localhost', 'database.example.com')],
    ])('%s', (_, databaseUrl) => {
        expect(() => assertSafeIntegrationDatabase({ ...validConfig, databaseUrl })).toThrow()
    })

    it('rejects missing or invalid integration flags', () => {
        expect(() =>
            assertSafeIntegrationDatabase({ ...validConfig, integrationFlag: undefined }),
        ).toThrow(/DWMC_INTEGRATION_TEST=1/)
        expect(() =>
            assertSafeIntegrationDatabase({ ...validConfig, integrationFlag: 'true' }),
        ).toThrow(/DWMC_INTEGRATION_TEST=1/)
    })

    it('rejects production environments', () => {
        expect(() =>
            assertSafeIntegrationDatabase({ ...validConfig, nodeEnv: 'production' }),
        ).toThrow(/NODE_ENV=test/)
    })

    it.each([undefined, 'development', 'production'])('rejects NODE_ENV=%s', (nodeEnv) => {
        expect(() => assertSafeIntegrationDatabase({ ...validConfig, nodeEnv })).toThrow(
            /NODE_ENV=test/,
        )
    })
})
