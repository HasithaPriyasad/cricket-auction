'use client'
import { useState } from 'react'
import type { TweakState, BidRule } from '@/features/auction/types'
import s from './admin.module.css'

interface ConfigPanelProps {
  tweaks: TweakState
  onSave: (changes: Partial<TweakState>) => void
}

export function ConfigPanel({ tweaks, onSave }: ConfigPanelProps) {
  const [eventName, setEventName] = useState(tweaks.eventName)
  const [eventYear, setEventYear] = useState(tweaks.eventYear)
  const [currencySymbol, setCurrencySymbol] = useState(tweaks.currencySymbol)
  const [logoUrl, setLogoUrl] = useState(tweaks.logoUrl)
  const [bidRules, setBidRules] = useState<BidRule[]>(tweaks.bidRules)
  const [maleBasePrice, setMaleBasePrice] = useState(tweaks.maleBasePrice)
  const [femaleBasePrice, setFemaleBasePrice] = useState(tweaks.femaleBasePrice)
  const [captainAuction, setCaptainAuction] = useState(tweaks.captainAuction)
  const [globalTeamBudget, setGlobalTeamBudget] = useState(tweaks.globalTeamBudget)
  const [secretBidThreshold, setSecretBidThreshold] = useState(tweaks.secretBidThreshold ?? 0)
  const [minPlayersPerTeam, setMinPlayersPerTeam] = useState(tweaks.minPlayersPerTeam ?? 0)
  const [minMalePerTeam, setMinMalePerTeam] = useState(tweaks.minMalePerTeam ?? 0)
  const [minFemalePerTeam, setMinFemalePerTeam] = useState(tweaks.minFemalePerTeam ?? 0)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function handleSave() {
    onSave({ eventName, eventYear, currencySymbol, logoUrl, bidRules, maleBasePrice, femaleBasePrice, captainAuction, globalTeamBudget, secretBidThreshold, minPlayersPerTeam, minMalePerTeam, minFemalePerTeam })
    setSavedAt(Date.now())
  }

  function updateRule(i: number, field: keyof BidRule, raw: string) {
    const val = Number(raw)
    setBidRules((prev) => prev.map((r, j) => j === i ? { ...r, [field]: val } : r))
  }

  function addRule() {
    const last = bidRules[bidRules.length - 1]
    const nextThreshold = last ? last.threshold + last.increment * 10 : 0
    setBidRules((prev) => [...prev, { threshold: nextThreshold, increment: last?.increment ?? 100_000 }])
  }

  function removeRule(i: number) {
    setBidRules((prev) => prev.filter((_, j) => j !== i))
  }

  return (
    <div className={s.configPanel}>
      <div className={s.configBody}>

        {/* ── Auction Mode ── */}
        <section className={s.configSection}>
          <h2 className={s.configSectionTitle}>Auction Mode</h2>

          <div className={s.configToggleRow}>
            <div>
              <div className={s.configToggleLabel}>Captain Auction</div>
              <div className={s.configToggleDesc}>
                {captainAuction
                  ? 'Captains are auctioned first in a separate phase before the main player auction.'
                  : 'All players (including captains) go into a single player auction pool.'}
              </div>
            </div>
            <button
              className={s.crTgl}
              data-on={captainAuction ? '1' : '0'}
              onClick={() => setCaptainAuction((v) => !v)}
            >
              <span className={s.crTglSw} />
              {captainAuction ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </section>

        {/* ── Event Branding ── */}
        <section className={s.configSection}>
          <h2 className={s.configSectionTitle}>Event Branding</h2>

          <div className={s.configGrid}>
            <div className={s.configField}>
              <label className={s.configLabel}>Event Name</label>
              <input
                className={s.configInput}
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Lanka Premier Auction"
              />
            </div>

            <div className={s.configField}>
              <label className={s.configLabel}>Year / Season</label>
              <input
                className={s.configInput}
                type="text"
                value={eventYear}
                onChange={(e) => setEventYear(e.target.value)}
                placeholder="e.g. 2026"
                style={{ maxWidth: 120 }}
              />
            </div>

            <div className={s.configField}>
              <label className={s.configLabel}>Currency Symbol</label>
              <input
                className={s.configInput}
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="₹ or LKR or $"
                style={{ maxWidth: 120 }}
              />
            </div>

            <div className={s.configField}>
              <label className={s.configLabel}>Event Logo</label>
              <div className={s.configLogoRow}>
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className={s.configLogoPreview} />
                )}
                <label className={s.configFileBtn}>
                  {logoUrl ? 'Change' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => setLogoUrl(ev.target?.result as string)
                      reader.readAsDataURL(file)
                      e.target.value = ''
                    }}
                  />
                </label>
                {logoUrl && (
                  <button className={s.configClearBtn} onClick={() => setLogoUrl('')}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Bid Rules ── */}
        <section className={s.configSection}>
          <h2 className={s.configSectionTitle}>Bid Increment Rules</h2>
          <p className={s.configHint}>
            When the current bid reaches the threshold, each subsequent bid increases by the step amount.
            Rules are evaluated highest-threshold first.
          </p>

          <div className={s.configRuleTable}>
            <div className={s.configRuleHeader}>
              <span>From (bid ≥)</span>
              <span>Increment by</span>
              <span />
            </div>
            {bidRules.map((rule, i) => (
              <div key={i} className={s.configRuleRow}>
                <input
                  className={s.configInput}
                  type="number"
                  min="0"
                  value={rule.threshold}
                  onChange={(e) => updateRule(i, 'threshold', e.target.value)}
                />
                <input
                  className={s.configInput}
                  type="number"
                  min="1"
                  value={rule.increment}
                  onChange={(e) => updateRule(i, 'increment', e.target.value)}
                />
                <button
                  className={s.configRuleRemove}
                  disabled={bidRules.length <= 1}
                  onClick={() => removeRule(i)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            <button className={s.configAddRule} onClick={addRule}>
              + Add bracket
            </button>
          </div>
        </section>

        {/* ── Team Budget ── */}
        <section className={s.configSection}>
          <h2 className={s.configSectionTitle}>Team Budget</h2>
          <p className={s.configHint}>
            Set a global budget for all teams. When non-zero, this overrides the budget set on each individual team.
            Set to 0 to use each team's own budget.
          </p>
          <div className={s.configGrid}>
            <div className={s.configField}>
              <label className={s.configLabel}>Global Team Budget</label>
              <input
                className={s.configInput}
                type="number"
                min="0"
                value={globalTeamBudget}
                onChange={(e) => setGlobalTeamBudget(Number(e.target.value))}
                placeholder="0 = use individual team budgets"
              />
            </div>
          </div>
        </section>

        {/* ── Secret Bid ── */}
        <section className={s.configSection}>
          <h2 className={s.configSectionTitle}>Secret Bid</h2>
          <p className={s.configHint}>
            When a bid reaches the threshold, the auction automatically switches to secret bid mode — teams privately
            submit their maximum to the auctioneer. Set to 0 to disable auto-trigger (you can still start a secret bid
            manually from the Auction panel).
          </p>
          <div className={s.configGrid}>
            <div className={s.configField}>
              <label className={s.configLabel}>Auto-trigger Threshold</label>
              <input
                className={s.configInput}
                type="number"
                min="0"
                step="100000"
                value={secretBidThreshold}
                onChange={(e) => setSecretBidThreshold(Number(e.target.value))}
                placeholder="0 = disabled"
              />
            </div>
          </div>
        </section>

        {/* ── Roster Requirements ── */}
        <section className={s.configSection}>
          <h2 className={s.configSectionTitle}>Roster Requirements</h2>
          <p className={s.configHint}>
            Set minimum player counts per team. These are shown as progress indicators on the bid buttons so the
            auctioneer can track squad composition at a glance. Set to 0 to disable a constraint.
          </p>

          <div className={s.configGrid}>
            <div className={s.configField}>
              <label className={s.configLabel}>Min Players per Team</label>
              <input
                className={s.configInput}
                type="number"
                min="0"
                value={minPlayersPerTeam}
                onChange={(e) => setMinPlayersPerTeam(Number(e.target.value))}
                placeholder="0 = no limit"
              />
            </div>

            <div className={s.configField}>
              <label className={s.configLabel}>Min Male per Team</label>
              <input
                className={s.configInput}
                type="number"
                min="0"
                value={minMalePerTeam}
                onChange={(e) => setMinMalePerTeam(Number(e.target.value))}
                placeholder="0 = no limit"
              />
            </div>

            <div className={s.configField}>
              <label className={s.configLabel}>Min Female per Team</label>
              <input
                className={s.configInput}
                type="number"
                min="0"
                value={minFemalePerTeam}
                onChange={(e) => setMinFemalePerTeam(Number(e.target.value))}
                placeholder="0 = no limit"
              />
            </div>
          </div>
        </section>

        {/* ── Base Price Override ── */}
        <section className={s.configSection}>
          <h2 className={s.configSectionTitle}>Base Price Override</h2>
          <p className={s.configHint}>
            Set a global base price per gender. When non-zero, this overrides the price set on individual players.
            Set to 0 to use each player's own base price.
          </p>

          <div className={s.configGrid}>
            <div className={s.configField}>
              <label className={s.configLabel}>Male Base Price</label>
              <input
                className={s.configInput}
                type="number"
                min="0"
                value={maleBasePrice}
                onChange={(e) => setMaleBasePrice(Number(e.target.value))}
                placeholder="0 = use player price"
              />
            </div>

            <div className={s.configField}>
              <label className={s.configLabel}>Female Base Price</label>
              <input
                className={s.configInput}
                type="number"
                min="0"
                value={femaleBasePrice}
                onChange={(e) => setFemaleBasePrice(Number(e.target.value))}
                placeholder="0 = use player price"
              />
            </div>
          </div>
        </section>

      </div>

      {/* ── Footer ── */}
      <div className={s.configFooter}>
        {savedAt && (
          <span className={s.configSavedBadge}>
            ✓ Saved
          </span>
        )}
        <button className={s.configSaveBtn} onClick={handleSave}>
          Save Configuration
        </button>
      </div>
    </div>
  )
}
