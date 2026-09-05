/**
 * tests/setup.ts
 *
 * Global Jest setup. Runs BEFORE each test file.
 * - Forces DATABASE_URL to test.db so prod/dev data is never touched
 * - Runs prisma migrate deploy once (beforeAll)
 * - Truncates all tables after every test (afterEach)
 */

// ── Must be set BEFORE any @/lib/prisma import ──
process.env.DATABASE_URL = 'file:./test.db'
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'test_webhook_secret'
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? 'rzp_test_TYDYtZ2Mw50n0Q'
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? 'qJQ4ZIk5njykyoRfOeS5Pf1x'
process.env.SKIP_RATE_LIMIT_DELAY = 'true'
// Silence Next.js server-only warnings in test environment
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: 'file:./test.db' } },
})

beforeAll(async () => {
  // Run migrations against test.db (idempotent)
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  })
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(async () => {
  // Delete in dependency order (children before parents)
  await prisma.action.deleteMany()
  await prisma.auditEntry.deleteMany()
  await prisma.intervention.deleteMany()
  await prisma.rootCause.deleteMany()
  await prisma.revenueEvent.deleteMany()
  await prisma.merchant.deleteMany()
})
