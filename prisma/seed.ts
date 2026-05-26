import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Add development seed data here as new modules are introduced.
  // Example:
  //   await prisma.userProfile.upsert({ where: { authUserId: 'dev-user-id' }, ... })

  console.log('✅ Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
