import { prisma } from '@/lib/prisma'
import type { Team } from '@/generated/prisma/client'

export type { Team }

export const TeamRepository = {
  findAll(): Promise<Team[]> {
    return prisma.team.findMany({ orderBy: { name: 'asc' } })
  },

  findById(id: string): Promise<Team | null> {
    return prisma.team.findUnique({ where: { id } })
  },

  create(data: Omit<Team, 'createdAt' | 'updatedAt'>): Promise<Team> {
    return prisma.team.create({ data })
  },

  update(id: string, data: Partial<Omit<Team, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Team> {
    return prisma.team.update({ where: { id }, data })
  },

  delete(id: string): Promise<Team> {
    return prisma.team.delete({ where: { id } })
  },
}
