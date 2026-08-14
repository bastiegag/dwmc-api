import { serve } from '@hono/node-server'
import { app } from './app.js'
import { env } from './config/env.js'

serve(
    {
        fetch: app.fetch,
        port: env.PORT,
        hostname: '0.0.0.0',
    },
    (info) => {
        console.log(`API listening on port ${info.port} (${env.NODE_ENV})`)
    },
)
