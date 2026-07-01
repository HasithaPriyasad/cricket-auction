import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PlayerRepository } from '@/repositories/PlayerRepository'

const ReorderSchema = z.object({
  orders: z.array(z.object({ id: z.number().int(), sortOrder: z.number().int().min(0) })).min(1),
})

export async function PATCH(req: Request) {
  const body = await req.json()
  const parsed = ReorderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  await PlayerRepository.updateSortOrders(parsed.data.orders)
  return NextResponse.json({ ok: true })
}
