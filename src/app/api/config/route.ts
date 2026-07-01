import { NextResponse } from 'next/server'
import { ConfigRepository } from '@/repositories/ConfigRepository'
import type { TweakState } from '@/features/auction/types'

export async function GET() {
  const tweaks = ConfigRepository.getTweaks()
  return NextResponse.json(tweaks)
}

export async function PATCH(req: Request) {
  const body: TweakState = await req.json()
  ConfigRepository.saveTweaks(body)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  ConfigRepository.clearTweaks()
  return NextResponse.json({ ok: true })
}
