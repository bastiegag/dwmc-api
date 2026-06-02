import { PrismaClient } from '@prisma/client'

// Reuse the PrismaClient instance in development to avoid exhausting connection limits
// when the module is hot-reloaded by tsx watch.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
    globalForPrisma.prisma = prisma
}
