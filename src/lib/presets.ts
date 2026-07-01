export type PresetKey = 'stadium' | 'neon' | 'bright' | 'mono'
export type CelebrationKey = 'subtle' | 'standard' | 'max'

export const PRESETS: Record<PresetKey, Record<string, string>> = {
  stadium: {
    '--bg': '#070b14', '--bg2': '#101a2e',
    '--panel': 'rgba(255,255,255,.05)', '--panel-brd': 'rgba(255,255,255,.11)',
    '--text': '#f3f7ff', '--text-dim': 'rgba(206,219,247,.56)',
    '--accent': '#f3b327', '--accent-ink': '#1a1402',
    '--glow': 'rgba(243,179,39,.45)', '--spot': 'rgba(96,134,210,.20)',
  },
  neon: {
    '--bg': '#0a0716', '--bg2': '#19103a',
    '--panel': 'rgba(255,255,255,.05)', '--panel-brd': 'rgba(180,140,255,.20)',
    '--text': '#f4f0ff', '--text-dim': 'rgba(208,196,247,.58)',
    '--accent': '#28e6d4', '--accent-ink': '#001a17',
    '--glow': 'rgba(40,230,212,.5)', '--spot': 'rgba(176,74,237,.28)',
  },
  bright: {
    '--bg': '#eef0f4', '--bg2': '#ffffff',
    '--panel': 'rgba(20,28,48,.045)', '--panel-brd': 'rgba(20,28,48,.12)',
    '--text': '#10182a', '--text-dim': 'rgba(16,24,42,.52)',
    '--accent': '#e6362f', '--accent-ink': '#fff',
    '--glow': 'rgba(230,54,47,.28)', '--spot': 'rgba(90,120,200,.16)',
  },
  mono: {
    '--bg': '#0d0f12', '--bg2': '#1a1e24',
    '--panel': 'rgba(255,255,255,.045)', '--panel-brd': 'rgba(255,255,255,.12)',
    '--text': '#eef1f5', '--text-dim': 'rgba(220,226,235,.5)',
    '--accent': '#dfe6ef', '--accent-ink': '#15181d',
    '--glow': 'rgba(223,230,239,.28)', '--spot': 'rgba(150,160,175,.16)',
  },
}

export const ACCENTS = ['#f3b327', '#28e6d4', '#e6362f', '#7c5cff', '#37d67a'] as const

export const DISPLAY_FONTS = [
  { value: 'Saira Condensed', label: 'Saira' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Archivo', label: 'Archivo' },
] as const

export const INTENSITY: Record<CelebrationKey, number> = {
  subtle: 0.5,
  standard: 1,
  max: 1.9,
}

export const TWEAK_DEFAULTS = {
  style: 'stadium' as PresetKey,
  accent: '#f3b327',
  teamTheming: true,
  displayFont: 'Saira Condensed',
  celebration: 'standard' as CelebrationKey,
  showFeed: true,
  spotlight: true,
  autoAdvanceDelay: 0,
  eventName: 'Lanka Premier Auction',
  eventYear: '2026',
  logoUrl: '',
  currencySymbol: '$',
  bidRules: [
    { threshold: 0,         increment: 100_000 },
    { threshold: 2_000_000, increment: 200_000 },
    { threshold: 5_000_000, increment: 500_000 },
  ],
  maleBasePrice: 0,
  femaleBasePrice: 0,
  captainAuction: true,
  globalTeamBudget: 0,
  secretBidThreshold: 0,
  minPlayersPerTeam: 0,
  minMalePerTeam: 0,
  minFemalePerTeam: 0,
}
