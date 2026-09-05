import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.revenueEvent.findUnique({
      where: { id: params.id },
      include: {
        rootCause: true,
        interventions: {
          include: {
            actions: true,
          },
          orderBy: { decidedAt: 'asc' },
        },
        auditEntries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
