import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_GUARDRAIL_CONFIG } from '@/lib/types'

export async function GET() {
  try {
    const merchant = await prisma.merchant.findFirst()
    if (!merchant) {
      return NextResponse.json({ config: DEFAULT_GUARDRAIL_CONFIG })
    }

    let config = DEFAULT_GUARDRAIL_CONFIG
    try {
      const parsed = JSON.parse(merchant.guardrailConfig)
      config = { ...DEFAULT_GUARDRAIL_CONFIG, ...parsed }
    } catch {
      // Use defaults
    }

    return NextResponse.json({ config })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const merchant = await prisma.merchant.findFirst()

    if (!merchant) {
      return NextResponse.json({ error: 'No merchant found' }, { status: 404 })
    }

    // Merge with existing config
    let existing = DEFAULT_GUARDRAIL_CONFIG
    try {
      existing = { ...existing, ...JSON.parse(merchant.guardrailConfig) }
    } catch {
      // Use defaults
    }

    const updated = { ...existing, ...body }

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { guardrailConfig: JSON.stringify(updated) },
    })

    return NextResponse.json({ config: updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
