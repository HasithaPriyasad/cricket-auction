import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' })
const prisma = new PrismaClient({ adapter })

const TEAMS = [
  { id: 'lions',    name: 'Colombo Lions',    short: 'LIONS',    abbreviation: 'CL', color: '#f0a500', budget: 18_000_000 },
  { id: 'warriors', name: 'Kandy Warriors',   short: 'WARRIORS', abbreviation: 'KW', color: '#e63950', budget: 18_000_000 },
  { id: 'titans',   name: 'Galle Titans',     short: 'TITANS',   abbreviation: 'GT', color: '#2a86e1', budget: 18_000_000 },
  { id: 'strikers', name: 'Jaffna Strikers',  short: 'STRIKERS', abbreviation: 'JS', color: '#b14aed', budget: 18_000_000 },
  { id: 'royals',   name: 'Dambulla Royals',  short: 'ROYALS',   abbreviation: 'DR', color: '#16b89a', budget: 18_000_000 },
  { id: 'falcons',  name: 'Negombo Falcons',  short: 'FALCONS',  abbreviation: 'NF', color: '#ff7a1a', budget: 18_000_000 },
]

const PLAYERS = [
  { id: 1,  name: 'Kasun Perera',      role: 'Batter',         country: 'Sri Lanka',   age: 27, jerseyNum: 45, basePrice: 1_000_000, tag: 'MARQUEE',
    stats: [['Matches','142'],['Runs','4,820'],['Strike Rate','148.2'],['Average','38.6']] },
  { id: 2,  name: 'Dinesh Madushanka', role: 'Fast Bowler',    country: 'Sri Lanka',   age: 24, jerseyNum: 18, basePrice: 800_000,   tag: '',
    stats: [['Matches','88'],['Wickets','121'],['Economy','7.4'],['Best','5/24']] },
  { id: 3,  name: 'Aiden Markvell',    role: 'All-rounder',    country: 'South Africa',age: 29, jerseyNum: 63, basePrice: 1_200_000, tag: 'MARQUEE',
    stats: [['Matches','176'],['Runs','3,140'],['Wickets','98'],['Strike Rate','139.0']] },
  { id: 4,  name: 'Tharindu Silva',    role: 'Wicket-keeper',  country: 'Sri Lanka',   age: 26, jerseyNum: 7,  basePrice: 700_000,   tag: '',
    stats: [['Matches','94'],['Runs','2,410'],['Dismissals','108'],['Strike Rate','132.4']] },
  { id: 5,  name: 'Jos Hartley',       role: 'Batter',         country: 'England',     age: 31, jerseyNum: 22, basePrice: 1_000_000, tag: '',
    stats: [['Matches','210'],['Runs','6,330'],['Strike Rate','141.7'],['Average','41.2']] },
  { id: 6,  name: 'Wanindu Rajapaksa', role: 'Leg-spinner',    country: 'Sri Lanka',   age: 25, jerseyNum: 49, basePrice: 900_000,   tag: '',
    stats: [['Matches','101'],['Wickets','143'],['Economy','6.8'],['Best','4/19']] },
  { id: 7,  name: 'Rashid Karim',      role: 'All-rounder',    country: 'Afghanistan', age: 27, jerseyNum: 19, basePrice: 1_200_000, tag: 'MARQUEE',
    stats: [['Matches','188'],['Wickets','201'],['Runs','1,980'],['Economy','6.3']] },
  { id: 8,  name: 'Sahan Fernando',    role: 'Fast Bowler',    country: 'Sri Lanka',   age: 22, jerseyNum: 91, basePrice: 500_000,   tag: 'UNCAPPED',
    stats: [['Matches','34'],['Wickets','47'],['Economy','7.9'],['Best','3/21']] },
  { id: 9,  name: 'Trent Mauler',      role: 'Fast Bowler',    country: 'New Zealand', age: 30, jerseyNum: 33, basePrice: 1_000_000, tag: '',
    stats: [['Matches','160'],['Wickets','198'],['Economy','7.1'],['Best','5/18']] },
  { id: 10, name: 'Pathum Nissanka',   role: 'Batter',         country: 'Sri Lanka',   age: 28, jerseyNum: 4,  basePrice: 900_000,   tag: '',
    stats: [['Matches','130'],['Runs','4,110'],['Strike Rate','136.5'],['Average','37.1']] },
  { id: 11, name: 'Glenn Maxfield',    role: 'All-rounder',    country: 'Australia',   age: 33, jerseyNum: 32, basePrice: 1_200_000, tag: 'MARQUEE',
    stats: [['Matches','244'],['Runs','5,620'],['Wickets','76'],['Strike Rate','156.3']] },
  { id: 12, name: 'Chamika Bandara',   role: 'Off-spinner',    country: 'Sri Lanka',   age: 23, jerseyNum: 56, basePrice: 500_000,   tag: 'UNCAPPED',
    stats: [['Matches','41'],['Wickets','52'],['Economy','7.0'],['Best','4/27']] },
  { id: 13, name: 'Marco Devereux',    role: 'Wicket-keeper',  country: 'West Indies', age: 26, jerseyNum: 12, basePrice: 800_000,   tag: '',
    stats: [['Matches','118'],['Runs','3,260'],['Dismissals','134'],['Strike Rate','145.9']] },
  { id: 14, name: 'Lahiru Kumara',     role: 'Fast Bowler',    country: 'Sri Lanka',   age: 27, jerseyNum: 28, basePrice: 700_000,   tag: '',
    stats: [['Matches','96'],['Wickets','128'],['Economy','7.6'],['Best','4/16']] },
]

async function main() {
  console.log('Seeding database…')

  // Upsert teams (idempotent)
  for (const t of TEAMS) {
    await prisma.team.upsert({
      where: { short: t.short },
      create: t,
      update: {},
    })
  }

  // Delete existing players + stats to ensure clean re-seed
  await prisma.playerStat.deleteMany()
  await prisma.player.deleteMany()

  for (const [i, p] of PLAYERS.entries()) {
    await prisma.player.create({
      data: {
        id: p.id,
        name: p.name,
        role: p.role,
        country: p.country,
        age: p.age,
        jerseyNum: p.jerseyNum,
        basePrice: p.basePrice,
        tag: p.tag,
        sortOrder: i,
        stats: {
          create: p.stats.map(([label, value], j) => ({ label, value, sortOrder: j })),
        },
      },
    })
  }

  // Create a default auction if none exists
  const existing = await prisma.auction.findFirst({ where: { name: 'Lanka Premier Auction 2026' } })
  if (!existing) {
    const auction = await prisma.auction.create({
      data: { name: 'Lanka Premier Auction 2026' },
    })

    for (const t of TEAMS) {
      await prisma.auctionTeam.create({
        data: { auctionId: auction.id, teamId: t.id },
      })
    }

    for (const [i, p] of PLAYERS.entries()) {
      await prisma.auctionLot.create({
        data: { auctionId: auction.id, playerId: p.id, lotNumber: i + 1 },
      })
    }

    console.log(`Created auction: ${auction.id}`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
