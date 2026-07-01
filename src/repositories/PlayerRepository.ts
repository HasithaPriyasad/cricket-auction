import { prisma } from '@/lib/prisma'
import type { Player, PlayerStat } from '@/generated/prisma/client'

export type { Player, PlayerStat }

export type PlayerWithStats = Player & { stats: PlayerStat[] }

export const PlayerRepository = {
  findAll(): Promise<PlayerWithStats[]> {
    return prisma.player.findMany({
      include: { stats: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })
  },

  // Returns all players without photoUrl body — fast since it skips large blobs.
  // Includes hasPhoto flag so callers can decide whether to lazy-load the photo endpoint.
  async findAllLite() {
    const [players, photoFlags] = await Promise.all([
      prisma.player.findMany({
        omit: { photoUrl: true },
        include: { stats: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.$queryRaw<Array<{ id: number | bigint; hasPhoto: number | boolean }>>`
        SELECT id, CASE WHEN photoUrl IS NOT NULL THEN 1 ELSE 0 END as hasPhoto FROM Player
      `,
    ])
    const flagMap = new Map(photoFlags.map((f) => [Number(f.id), Boolean(f.hasPhoto)]))
    return players.map((p) => ({ ...p, photoUrl: null as string | null, hasPhoto: flagMap.get(p.id) ?? false }))
  },

  findById(id: number): Promise<PlayerWithStats | null> {
    return prisma.player.findUnique({
      where: { id },
      include: { stats: { orderBy: { sortOrder: 'asc' } } },
    })
  },

  convertToPlayers(ids: number[]): Promise<void> {
    return prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ids.map((id) => prisma.player.update({ where: { id }, data: { category: 'player' } as any })),
    ).then(() => undefined)
  },

  create(
    data: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
    stats: Array<{ label: string; value: string; sortOrder: number }>,
  ): Promise<PlayerWithStats> {
    return prisma.player.create({
      data: { ...data, stats: { create: stats } },
      include: { stats: { orderBy: { sortOrder: 'asc' } } },
    })
  },

  update(
    id: number,
    data: Partial<Omit<Player, 'id' | 'createdAt' | 'updatedAt'>>,
    stats?: Array<{ label: string; value: string; sortOrder: number }>,
  ): Promise<PlayerWithStats> {
    return prisma.$transaction(async (tx) => {
      if (stats) {
        await tx.playerStat.deleteMany({ where: { playerId: id } })
        await tx.playerStat.createMany({
          data: stats.map((s) => ({ ...s, playerId: id })),
        })
      }
      return tx.player.update({
        where: { id },
        data,
        include: { stats: { orderBy: { sortOrder: 'asc' } } },
      })
    })
  },

  updateSortOrders(orders: Array<{ id: number; sortOrder: number }>): Promise<void> {
    return prisma.$transaction(
      orders.map(({ id, sortOrder }) => prisma.player.update({ where: { id }, data: { sortOrder } })),
    ).then(() => undefined)
  },

  delete(id: number): Promise<Player> {
    return prisma.$transaction(async (tx) => {
      await tx.auctionLot.deleteMany({ where: { playerId: id } })
      return tx.player.delete({ where: { id } })
    })
  },
}
