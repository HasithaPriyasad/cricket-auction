import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id: Number(id) },
    select: { photoUrl: true },
  })

  if (!player?.photoUrl) {
    return new Response(null, { status: 404 })
  }

  const { photoUrl } = player

  if (photoUrl.startsWith('http')) {
    return Response.redirect(photoUrl, 302)
  }

  if (photoUrl.startsWith('data:')) {
    const commaIdx = photoUrl.indexOf(',')
    const header = photoUrl.slice(0, commaIdx)
    const body = photoUrl.slice(commaIdx + 1)
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
    const buffer = Buffer.from(body, 'base64')
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  return new Response(null, { status: 404 })
}
