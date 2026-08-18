import { serve } from '@hono/node-server'
import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'

const server = serve(
    {
        fetch: app.fetch,
        port: env.PORT,
        hostname: '0.0.0.0',
    },
    (info) => {
        console.log(`API listening on port ${info.port} (${env.NODE_ENV})`)
    },
)

const shutdown = async (signal: string) => {
    console.log(`Received ${signal}; shutting down`)
    server.close()
    await prisma.$disconnect()
}

process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))
