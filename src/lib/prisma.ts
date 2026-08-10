import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  pgPool?: Pool
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  prisma = new PrismaClient({
    adapter,
    log: ['error'],
  })
} else {
  if (!globalForPrisma.pgPool) {
    const connectionString = process.env.DATABASE_URL
    globalForPrisma.pgPool = new Pool({ connectionString })
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pgPool)
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ['error'],
    })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }