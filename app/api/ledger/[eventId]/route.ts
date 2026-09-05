import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyHashChain } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params

    const entries = await prisma.auditEntry.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    })

    if (entries.length === 0) {
      // Distinguish between "no audit entries yet" and "event doesn't exist"
      const event = await prisma.revenueEvent.findUnique({ where: { id: eventId } })
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    }

    return NextResponse.json({ entries })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const result = await verifyHashChain(eventId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
