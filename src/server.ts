import { serve } from '@hono/node-server'
import { app } from './app.js'
import { env } from './config/env.js'

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`🚀 Server running on http://localhost:${info.port} (${env.NODE_ENV})`)
  },
)
