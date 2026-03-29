import { useState } from 'react'
import type { CSSProperties } from 'react'
import { sfx } from '../sounds'

interface BoardPrize {
  id: number
  name: string
  image: string
  qty: number   // items given per cell reveal
  cells: number // total cells on board
}

const BOARD_PRIZES: BoardPrize[] = [
  { id: 1,  name: 'กล่องจินอาร์ค',           image: 'box-jinark.png',           qty: 1, cells: 1  },
  { id: 16, name: 'กล่องจินอาร์คไม่สมบูรณ์',  image: 'box-jinark-incomplete.png', qty: 2, cells: 5  },
  { id: 17, name: 'กล่องจินอาร์คไม่สมบูรณ์',  image: 'box-jinark-incomplete.png', qty: 1, cells: 12 },
  { id: 18, name: 'ร่องรอยจินอาร์ค',           image: 'trace-jinark.png',          qty: 2, cells: 15 },
  { id: 19, name: 'ร่องรอยจินอาร์ค',           image: 'trace-jinark.png',          qty: 1, cells: 39 },
  { id: 0,  name: 'กล่องสุ่มอื่น',             image: 'random-devil.png',          qty: 0, cells: 28 },
]

interface CellData {
  prizeId: number
  revealed: boolean
}

function generateBoard(): CellData[] {
  const cells: CellData[] = []
  BOARD_PRIZES.forEach(p => {
    for (let i = 0; i < p.cells; i++) cells.push({ prizeId: p.id, revealed: false })
  })
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells
}

function getPrize(id: number): BoardPrize {
  return BOARD_PRIZES.find(p => p.id === id) ?? BOARD_PRIZES[BOARD_PRIZES.length - 1]!
}

function fmt(n: number) { return n.toLocaleString() }

export function SimulationTab() {
  const [cells, setCells]           = useState<CellData[]>(generateBoard)
  const [tokens, setTokens]         = useState(0)
  const [tokensAdded, setTokensAdded]   = useState(0)
  const [tokensSpent, setTokensSpent]   = useState(0)
  const [cellsOpened, setCellsOpened]   = useState(0)
  const [shakeCount, setShakeCount]     = useState(0)
  const [inventory, setInventory]   = useState<Record<number, number>>({})
  const [addAmount, setAddAmount]   = useState(5000)
  const [highlighted, setHighlighted]   = useState<Set<number>>(new Set())
  const [confirmReset, setConfirmReset] = useState(false)

  const revealedCount    = cells.filter(c => c.revealed).length
  const unrevealedIdx    = cells.map((c, i) => c.revealed ? -1 : i).filter(i => i >= 0)
  const boardDone        = unrevealedIdx.length === 0

  function flashHighlight(indices: number[]) {
    setHighlighted(new Set(indices))
    setTimeout(() => setHighlighted(new Set()), 1000)
  }

  function doReveal(indices: number[], cost: number, isShake: boolean) {
    const toReveal = indices.filter(i => !cells[i].revealed)
    if (toReveal.length === 0) return

    const gained: Record<number, number> = {}
    toReveal.forEach(i => {
      const p = getPrize(cells[i].prizeId)
      if (p.qty > 0) gained[p.id] = (gained[p.id] ?? 0) + p.qty
    })

    setCells(prev => {
      const next = [...prev]
      toReveal.forEach(i => { next[i] = { ...next[i], revealed: true } })
      return next
    })
    setInventory(inv => {
      const next = { ...inv }
      Object.entries(gained).forEach(([id, qty]) => { next[+id] = (next[+id] ?? 0) + qty })
      return next
    })
    setTokens(t => t - cost)
    setTokensSpent(s => s + cost)
    setCellsOpened(n => n + toReveal.length)
    if (isShake) setShakeCount(n => n + 1)
    flashHighlight(toReveal)
  }

  function handleOpenCell(idx: number) {
    if (cells[idx].revealed || tokens < 50) return
    sfx.click()
    doReveal([idx], 50, false)
  }

  function handleShake() {
    if (tokens < 250 || boardDone) return
    sfx.click()
    const bonus   = Math.floor(Math.random() * 5)
    const count   = Math.min(5 + bonus, unrevealedIdx.length)
    const picked  = [...unrevealedIdx].sort(() => Math.random() - 0.5).slice(0, count)
    doReveal(picked, 250, true)
  }

  function handleReset() {
    sfx.click()
    if (!confirmReset) { setConfirmReset(true); return }
    setCells(generateBoard())
    setTokensSpent(0); setCellsOpened(0); setShakeCount(0)
    setInventory({}); setHighlighted(new Set()); setConfirmReset(false)
  }

  function addTokens(n: number) {
    sfx.click()
    setTokens(t => t + n)
    setTokensAdded(a => a + n)
  }

  // Aggregate inventory by image
  const invAgg = new Map<string, { name: string; image: string; qty: number }>()
  Object.entries(inventory).forEach(([idStr, qty]) => {
    const p = getPrize(+idStr)
    const existing = invAgg.get(p.image)
    if (existing) existing.qty += qty
    else invAgg.set(p.image, { name: p.name, image: p.image, qty })
  })
  const invRows = [...invAgg.values()]

  const costPerCell  = tokensSpent > 0 ? Math.round(tokensSpent / Math.max(1, cellsOpened)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ─── Top bar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 10, padding: '14px 20px',
      }}>
        {/* Token balance */}
        <span style={{ fontSize: 34, fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'var(--font-display)', minWidth: 120 }}>
          🪙 {fmt(tokens)}
        </span>

        {/* Add tokens */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input
            type="number" min={1} value={addAmount}
            onChange={e => setAddAmount(Math.max(1, parseInt(e.target.value) || 1))}
            style={numInput}
          />
          <button onClick={() => addTokens(addAmount)} style={btn('#1e3a5f', '#3b82f6')}>เติม</button>
          {[1000, 5000, 10000].map(n => (
            <button key={n} onClick={() => addTokens(n)} style={{ ...btn('#1e3a5f', '#3b82f6'), fontSize: 13, padding: '7px 10px' }}>
              +{n >= 1000 ? `${n / 1000}k` : n}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

        {/* Actions */}
        <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>คลิกเซล = เปิด (50 🪙)</span>
        <button onClick={handleShake} disabled={tokens < 250 || boardDone} style={btn('#2d1a00', '#f59e0b', tokens < 250 || boardDone)}>
          เขย่ากระดาน 5~9 เซล (250 🪙)
        </button>
        <button
          onClick={handleReset}
          style={btn(confirmReset ? '#7f1d1d' : '#3b0a0a', confirmReset ? '#ef4444' : '#dc2626')}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? '⚠️ ยืนยันรีเซ็ต?' : 'รีเซ็ตกระดาน'}
        </button>
        {confirmReset && (
          <button onClick={() => setConfirmReset(false)} style={btn('#1a1a2e', '#4b5563')}>ยกเลิก</button>
        )}
      </div>

      {/* ─── Main layout ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        {/* Board */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 3,
          flex: '0 0 auto',
          width: 'min(640px, 58vw)',
        }}>
          {cells.map((cell, idx) => {
            const lit = highlighted.has(idx)

            if (cell.revealed) {
              const prize = getPrize(cell.prizeId)
              return (
                <div key={idx} style={{
                  aspectRatio: '1', borderRadius: 4,
                  background: lit ? '#064e3b' : 'var(--color-surface-alt)',
                  border: `1px solid ${lit ? 'var(--color-success)' : 'var(--color-border)'}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: 2, gap: 1,
                  transition: 'background 0.4s, border-color 0.4s',
                }}>
                  <img
                    src={`/images/${prize.image}`} alt={prize.name}
                    style={{ width: '58%', height: '58%', objectFit: 'contain' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/placeholder.png' }}
                  />
                  {prize.qty > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1 }}>×{prize.qty}</span>
                  )}
                </div>
              )
            }

            return (
              <div
                key={idx}
                className="sim-cell-hidden"
                onClick={() => handleOpenCell(idx)}
                style={{
                  aspectRatio: '1', position: 'relative', borderRadius: 4, overflow: 'hidden',
                  cursor: tokens >= 50 ? 'pointer' : 'not-allowed',
                }}
              >
                <img className="cell-default" src="/images/cell.png" alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/placeholder.png' }}
                />
                <img className="cell-hover" src="/images/hover-cell.png" alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, pointerEvents: 'none' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/placeholder.png' }}
                />
              </div>
            )
          })}
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Prize table */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 18 }}>
              รางวัลในกระดาน ({revealedCount}/100)
            </div>
            {BOARD_PRIZES.map(prize => {
              const revealed  = cells.filter(c => c.revealed && c.prizeId === prize.id).length
              const remaining = prize.cells - revealed
              const done      = remaining === 0
              return (
                <div key={prize.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
                  borderBottom: '1px solid var(--color-border)',
                  background: done ? 'rgba(16,185,129,0.06)' : 'transparent',
                  opacity: done ? 0.7 : 1,
                }}>
                  <img src={`/images/${prize.image}`} alt={prize.name}
                    style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/placeholder.png' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prize.name}{prize.qty > 1 ? ` ×${prize.qty}` : ''}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{prize.cells} ช่อง • {prize.cells}%</div>
                  </div>
                  <span style={{
                    fontSize: 17, fontWeight: 700, minWidth: 58, textAlign: 'right',
                    color: done ? 'var(--color-success)' : 'var(--color-accent-light)',
                  }}>
                    {done ? '✓' : `${remaining}/${prize.cells}`}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Session inventory */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 18 }}>
              ของที่ได้รับ
            </div>
            <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10, minHeight: 60 }}>
              {invRows.length === 0 && (
                <span style={{ fontSize: 15, color: 'var(--color-text-muted)', padding: '6px 4px' }}>ยังไม่ได้รับของ</span>
              )}
              {invRows.map(r => (
                <div key={r.image} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--color-surface-alt)', borderRadius: 8,
                  padding: '8px 14px', border: '1px solid var(--color-border)',
                }}>
                  <img src={`/images/${r.image}`} alt={r.name}
                    style={{ width: 34, height: 34, objectFit: 'contain' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/placeholder.png' }}
                  />
                  <span style={{ fontSize: 17, fontWeight: 700 }}>×{fmt(r.qty)}</span>
                  <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{r.name.replace('จินอาร์ค', '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>สถิติ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <StatRow label="เหรียญที่เติม"     value={`${fmt(tokensAdded)} 🪙`} />
              <StatRow label="เหรียญที่ใช้ไป"    value={`${fmt(tokensSpent)} 🪙`} color="var(--color-warning)" />
              <StatRow label="เหรียญคงเหลือ"     value={`${fmt(tokens)} 🪙`}      color="var(--color-success)" />
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <StatRow label="เซลที่เปิด"        value={`${revealedCount} / 100`} />
              <StatRow label="เขย่ากระดาน"       value={`${shakeCount} ครั้ง`} />
              <StatRow label="ความคืบหน้า"        value={`${revealedCount}%`} color={revealedCount === 100 ? 'var(--color-success)' : 'var(--color-accent-light)'} />
              {cellsOpened > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--color-border)' }} />
                  <StatRow label="เฉลี่ยต่อเซล"  value={`${fmt(costPerCell)} 🪙`} />
                  <StatRow label="ต้นทุนกระดาน"  value={`~${fmt(costPerCell * 100)} 🪙`} color="var(--color-text-muted)" />
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: color ?? 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

const numInput: CSSProperties = {
  width: 100, textAlign: 'center',
  background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
  borderRadius: 8, color: 'var(--color-text)', padding: '9px 10px', fontSize: 17,
  fontFamily: 'var(--font-body)',
}

function btn(bg: string, border: string, disabled = false): CSSProperties {
  return {
    padding: '10px 20px',
    background: disabled ? 'var(--color-surface-alt)' : bg,
    color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)',
    border: `1px solid ${disabled ? 'var(--color-border)' : border}`,
    borderRadius: 10, fontSize: 16, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-body)', opacity: disabled ? 0.6 : 1,
  }
}
