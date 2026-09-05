import { createHash } from 'crypto'
import { prisma } from './prisma'

/**
 * Compute SHA-256 hash for an audit entry
 * hash = sha256(prevHash + eventId + actor + decision + timestamp)
 */
export function computeHash(params: {
  prevHash: string
  eventId: string
  actor: string
  decision: string
  createdAt: Date
}): string {
  const content = [
    params.prevHash,
    params.eventId,
    params.actor,
    params.decision,
    params.createdAt.toISOString(),
  ].join('|')
  
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Get the last audit entry for an event to build the hash chain
 */
async function getLastAuditEntry(eventId: string) {
  return prisma.auditEntry.findFirst({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Create a new audit entry with hash chain
 */
export async function createAuditEntry(params: {
  eventId: string
  actor: 'agent' | 'human' | 'system' | 'guardrail'
  decision: string
  reason: string
}) {
  const now = new Date()
  const lastEntry = await getLastAuditEntry(params.eventId)
  const prevHash = lastEntry?.hash ?? '0'

  const hash = computeHash({
    prevHash,
    eventId: params.eventId,
    actor: params.actor,
    decision: params.decision,
    createdAt: now,
  })

  return prisma.auditEntry.create({
    data: {
      eventId: params.eventId,
      actor: params.actor,
      decision: params.decision,
      reason: params.reason,
      prevHash,
      hash,
      createdAt: now,
    },
  })
}

/**
 * Verify the hash chain for an event
 * Returns true if the chain is intact, false if tampered
 */
export async function verifyHashChain(eventId: string): Promise<{
  valid: boolean
  entries: Array<{
    id: string
    hash: string
    computedHash: string
    valid: boolean
  }>
}> {
  const entries = await prisma.auditEntry.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
  })

  const results = entries.map((entry, i) => {
    const computedHash = computeHash({
      prevHash: entry.prevHash,
      eventId: entry.eventId,
      actor: entry.actor,
      decision: entry.decision,
      createdAt: entry.createdAt,
    })
    return {
      id: entry.id,
      hash: entry.hash,
      computedHash,
      valid: computedHash === entry.hash,
    }
  })

  return {
    valid: results.every((r) => r.valid),
    entries: results,
  }
}
