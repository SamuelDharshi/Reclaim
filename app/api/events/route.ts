import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '100')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type

    const [events, total] = await Promise.all([
      prisma.revenueEvent.findMany({
        where,
        include: {
          rootCause: true,
          interventions: {
            include: {
              actions: true,
            },
          },
          auditEntries: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { detectedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.revenueEvent.count({ where }),
    ])

    return NextResponse.json({ events, total, page, limit })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
