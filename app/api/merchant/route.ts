import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const merchant = await prisma.merchant.findFirst({
      select: { id: true, name: true, razorpayKeyId: true, createdAt: true },
    })

    if (!merchant) {
      return NextResponse.json({ error: 'No merchant found' }, { status: 404 })
    }

    return NextResponse.json(merchant)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
