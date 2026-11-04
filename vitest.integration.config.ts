import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./src/integration-tests/setup.ts'],
        include: ['./src/integration-tests/**/*.integration.test.ts'],
    },
})
