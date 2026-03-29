import { useState, useEffect, useRef, useMemo } from 'react'
import { sfx } from '../sounds'
import type { RecipeNode, ProgressMap, AltMap } from '../types'
import { collectLeaves } from '../utils'
import { NodeImage } from './NodeImage'

// Inventory column order: [ปีก(1), ผ้าปิดตา(2), ผม(0)]
const TOP_COLS = [1, 2, 0]

const COL_MODES_KEY = 'tr_colmodes'
type ColMode = 'piece' | 'crystal'

// Board drop rates (per 1 cell opened = 50 tokens)
const BOARD = {
  boxPerCell:            0.01,        // 1%
  incompleteBoxPerCell:  0.22,        // 5%×2 + 12%×1
  tracePerCell:          0.69,        // 15%×2 + 39%×1
  tokensPerCell:         50,
  tracesPerBox:          150,
} as const

interface Props {
  recipeChildren: RecipeNode[]
  progress: ProgressMap
  qty: number
  altMap: AltMap
  onProgress: (key: string, value: number | boolean) => void
}

interface Popover {
  key: string
  needScaled: number
  x: number
  y: number
}

export function InventoryGrid({ recipeChildren, progress, qty, altMap, onProgress }: Props) {
  const [colModes, setColModes] = useState<ColMode[]>(() => {
    try {
      const raw = localStorage.getItem(COL_MODES_KEY)
      return raw ? (JSON.parse(raw) as ColMode[]) : ['crystal', 'crystal', 'crystal']
    } catch {
      return ['crystal', 'crystal', 'crystal']
    }
  })
  const [popover, setPopover] = useState<Popover | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popover) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popover])

  function switchColMode(col: number, mode: ColMode) {
    sfx.click()
    setColModes(prev => {
      const next = [...prev] as ColMode[]
      next[col] = mode
      localStorage.setItem(COL_MODES_KEY, JSON.stringify(next))
      return next
    })
  }

  // ── Requirements computation ─────────────────────────────────────────────

  const req = useMemo(() => {
    // Worst case: every box drops only 1 crystal
    let crystalsStillNeeded = 0
    TOP_COLS.forEach((recipeIdx, col) => {
      if (colModes[col] !== 'crystal') return
      const crystalNode = recipeChildren[recipeIdx]?.children?.[0]
      if (!crystalNode) return
      const have = (progress[`root_${recipeIdx}_0`] as number) ?? 0
      const needed = crystalNode.need * qty
      crystalsStillNeeded += Math.max(0, needed - have)
    })

    const worstCaseBoxes  = crystalsStillNeeded                            // 1 crystal = 1 box
    const boxesHave       = (progress['__box'] as number) ?? 0
    const netBoxes        = Math.max(0, worstCaseBoxes - boxesHave)

    const tracesTarget        = worstCaseBoxes * BOARD.tracesPerBox         // total traces for ALL needed boxes
    const tracesHave          = (progress['__trace'] as number) ?? 0
    const incompleteBoxesHave = (progress['__box_inc'] as number) ?? 0
    // Incomplete box worst case = 1 trace each
    const tracesEffective     = tracesHave + incompleteBoxesHave            // traces + 1×incomplete boxes
    const netTraces           = Math.max(0, netBoxes * BOARD.tracesPerBox - tracesEffective)

    // Expected cells: use combined rate (direct boxes + boxes craftable from trace drops)
    const boxesPerCell    = BOARD.boxPerCell + BOARD.tracePerCell / BOARD.tracesPerBox  // ≈ 0.0146
    const expectedCells   = netBoxes > 0 ? Math.ceil(netBoxes / boxesPerCell) : 0
    const expectedTokens  = expectedCells * BOARD.tokensPerCell

    // Estimated hours: 1.5h session gives 500 (best) / 350 (avg) / 200 (worst) tokens + 500 daily quest
    const TOKENS_PER_SESSION = { best: 500, avg: 350, worst: 200 }
    const DAILY_QUEST = 500
    const SESSION_HOURS = 1.5
    const SESSIONS_PER_DAY = 24 / SESSION_HOURS  // theoretical max, used to convert daily quest to per-session bonus
    function hoursNeeded(tokPerSession: number) {
      if (expectedTokens === 0) return 0
      const tokPerSessionWithDaily = tokPerSession + DAILY_QUEST / SESSIONS_PER_DAY
      const sessions = expectedTokens / tokPerSessionWithDaily
      return sessions * SESSION_HOURS
    }
    const estHours = {
      best:  hoursNeeded(TOKENS_PER_SESSION.best),
      avg:   hoursNeeded(TOKENS_PER_SESSION.avg),
      worst: hoursNeeded(TOKENS_PER_SESSION.worst),
    }

    return { worstCaseBoxes, boxesHave, netBoxes, tracesTarget, tracesHave, incompleteBoxesHave, tracesEffective, netTraces, expectedCells, expectedTokens, estHours }
  }, [colModes, recipeChildren, progress, qty])

  // ── Middle leaves ────────────────────────────────────────────────────────

  const middleLeaves = recipeChildren[3]
    ? collectLeaves(recipeChildren[3].children ?? [], 'root_3', qty, altMap)
    : []

  // ── Helpers ──────────────────────────────────────────────────────────────

  function itemCard(
    node: { name: string; image?: string },
    key: string,
    isCounter: boolean,
    have: number,
    needScaled: number,
    active: boolean,
    onClick: () => void,
    onRightClick?: (e: React.MouseEvent) => void,
  ) {
    const owned = have > 0
    const done  = needScaled > 0 && have >= needScaled

    return (
      <div
        key={key}
        onClick={() => { sfx.click(); onClick() }}
        onContextMenu={onRightClick ?? (e => e.preventDefault())}
        title={active ? node.name : `คลิกเพื่อติดตาม ${node.name}`}
        style={{
          background: 'var(--color-surface)',
          border: `1px solid ${done ? 'var(--color-success)' : 'var(--color-border)'}`,
          borderRadius: 8,
          padding: '12px 6px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          filter: active && owned ? 'none' : 'grayscale(1) brightness(0.5)',
          opacity: active ? 1 : 0.4,
          outline: done ? '1px solid var(--color-success)' : 'none',
          transition: 'filter 0.15s, opacity 0.15s',
        }}
      >
        {!active && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 8,
            border: '2px dashed var(--color-border)',
            pointerEvents: 'none',
          }} />
        )}
        <NodeImage image={node.image} name={node.name} size={68} />
        <span style={{
          fontSize: 13, color: 'var(--color-text)',
          textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word', maxWidth: '100%',
        }}>{node.name}</span>
        {isCounter && needScaled > 0 && (
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: done ? 'var(--color-success)' : 'var(--color-accent-light)',
          }}>{have}/{needScaled}</span>
        )}
        {isCounter && needScaled === 0 && have > 0 && (
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent-light)' }}>{have}</span>
        )}
        {!isCounter && owned && (
          <span style={{ fontSize: 18, color: 'var(--color-success)' }}>✓</span>
        )}
      </div>
    )
  }

  function sectionDivider(label: string) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 14px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        <span style={{ fontSize: 15, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>
    )
  }

  // ── Top section rows ─────────────────────────────────────────────────────

  const topPieceRow = TOP_COLS.map((recipeIdx, col) => {
    const pieceNode = recipeChildren[recipeIdx]
    if (!pieceNode) return <div key={`piece-${col}`} />
    const pieceKey  = `root_${recipeIdx}`
    const isActive  = colModes[col] === 'piece'
    const owned     = progress[pieceKey] === true

    return itemCard(pieceNode, `piece-${col}`, false, owned ? 1 : 0, 1, isActive,
      () => {
        if (!isActive) { switchColMode(col, 'piece'); return }
        onProgress(pieceKey, !owned)
      },
    )
  })

  const topCrystalRow = TOP_COLS.map((recipeIdx, col) => {
    const crystalNode = recipeChildren[recipeIdx]?.children?.[0]
    if (!crystalNode) return <div key={`crystal-${col}`} />
    const crystalKey = `root_${recipeIdx}_0`
    const isActive   = colModes[col] === 'crystal'
    const have       = (progress[crystalKey] as number) ?? 0
    const needScaled = crystalNode.need * qty

    return itemCard(crystalNode, `crystal-${col}`, true, have, needScaled, isActive,
      () => {
        if (!isActive) { switchColMode(col, 'crystal'); return }
        onProgress(crystalKey, have > 0 ? 0 : needScaled)
      },
      (e) => {
        e.preventDefault()
        if (!isActive) { switchColMode(col, 'crystal'); return }
        setPopover({ key: crystalKey, needScaled, x: e.clientX, y: e.clientY })
      },
    )
  })

  // ── Bottom items (materials) ─────────────────────────────────────────────

  const bottomItems = [
    { name: 'กล่องจินอาร์ค',           image: 'box-jinark.png',           key: '__box',    need: req.worstCaseBoxes },
    { name: 'กล่องจินอาร์คไม่สมบูรณ์',  image: 'box-jinark-incomplete.png', key: '__box_inc', need: 0 },
    { name: 'ร่องรอยจินอาร์ค',          image: 'trace-jinark.png',          key: '__trace',  need: req.tracesTarget   },
    { name: 'เหรียญทองลาสเคออส',         image: 'golden-last-chaos.png',     key: '__golden', need: req.expectedTokens  },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  const popoverHave = popover ? ((progress[popover.key] as number) ?? 0) : 0

  function fmt(n: number) { return n.toLocaleString() }

  function fmtHours(h: number) {
    if (h === 0) return '—'
    const totalMin = Math.round(h * 60)
    const hrs = Math.floor(totalMin / 60)
    const min = totalMin % 60
    if (hrs === 0) return `${min} นาที`
    if (min === 0) return `${hrs} ชม.`
    return `${hrs} ชม. ${min} นาที`
  }

  return (
    <div style={{ position: 'relative' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 26,
        color: 'var(--color-text-muted)', marginBottom: 16,
        letterSpacing: 1, textTransform: 'uppercase',
      }}>Inventory</h2>

      {/* TOP 2×3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {topPieceRow}
        {topCrystalRow}
      </div>

      {/* MIDDLE — prima */}
      {middleLeaves.length > 0 && (
        <>
          {sectionDivider('พรีมา')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {middleLeaves.map(leaf => {
              const isCheckbox = leaf.node.type === 'checkbox'
              const have = isCheckbox
                ? (progress[leaf.key] === true ? 1 : 0)
                : ((progress[leaf.key] as number) ?? 0)
              return itemCard(
                leaf.node, leaf.key, !isCheckbox, have, leaf.needScaled, true,
                () => {
                  if (isCheckbox) onProgress(leaf.key, !(progress[leaf.key] === true))
                  else onProgress(leaf.key, have > 0 ? 0 : leaf.needScaled)
                },
                !isCheckbox ? (e) => {
                  e.preventDefault()
                  setPopover({ key: leaf.key, needScaled: leaf.needScaled, x: e.clientX, y: e.clientY })
                } : undefined,
              )
            })}
          </div>
        </>
      )}

      {/* BOTTOM — materials */}
      {sectionDivider('วัสดุ')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {bottomItems.map(item => {
          const have = (progress[item.key] as number) ?? 0
          return itemCard(
            item, item.key, true, have, item.need, true,
            () => onProgress(item.key, have > 0 ? 0 : Math.max(1, item.need)),
            (e) => {
              e.preventDefault()
              setPopover({ key: item.key, needScaled: item.need, x: e.clientX, y: e.clientY })
            },
          )
        })}
      </div>

      {/* REQUIREMENTS PANEL */}
      {sectionDivider('ประมาณการ')}
      <div style={{
        background: 'var(--color-surface-alt)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '14px 18px',
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <ReqRow label="กล่องที่ต้องการ" value={fmt(req.worstCaseBoxes)} have={fmt(req.boxesHave)} net={fmt(req.netBoxes)} />
        <ReqRow
          label="ร่องรอยที่ต้องการ"
          value={fmt(req.tracesTarget)}
          have={`${fmt(req.tracesHave)}${req.incompleteBoxesHave > 0 ? ` +${fmt(req.incompleteBoxesHave)}` : ''}`}
          net={fmt(req.netTraces)}
          haveNote={req.incompleteBoxesHave > 0 ? 'กล่องไม่สมบูรณ์' : undefined}
        />
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>คาดการณ์เซล</span>
            <span style={{ fontWeight: 700 }}>~{fmt(req.expectedCells)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>เหรียญที่ต้องใช้</span>
            <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>~{fmt(req.expectedTokens)}</span>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2, letterSpacing: 0.5 }}>
            ⏱ เวลาโดยประมาณ <span style={{ opacity: 0.6 }}>(1.5ชม. = 200 / 350 / 500 🪙 + เควสรายวัน 500 🪙)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#f87171' }}>😢 แพ้ทุกรอบ</span>
            <span style={{ fontWeight: 700, color: '#f87171' }}>~{fmtHours(req.estHours.worst)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>😐 เฉลี่ย</span>
            <span style={{ fontWeight: 700 }}>~{fmtHours(req.estHours.avg)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#4ade80' }}>🏆 ชนะทุกรอบ</span>
            <span style={{ fontWeight: 700, color: '#4ade80' }}>~{fmtHours(req.estHours.best)}</span>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 2, padding: '4px 8px',
          background: '#451a03', borderRadius: 4, border: '1px solid #92400e',
        }}>
          <span style={{ fontSize: 15 }}>⚠️</span>
          <span style={{ fontSize: 13, color: '#fcd34d' }}>
            worst case: สมมติทุกกล่องได้คริสตัล ×1
          </span>
        </div>
      </div>

      {/* Quantity popover */}
      {popover && (
        <div ref={popoverRef} style={{
          position: 'fixed', top: popover.y, left: popover.x, zIndex: 200,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: '10px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140,
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>Set Quantity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => onProgress(popover.key, Math.max(0, popoverHave - 1))} style={popBtn}>−</button>
            <input
              type="number" min={0} value={popoverHave}
              onChange={e => onProgress(popover.key, Math.max(0, parseInt(e.target.value) || 0))}
              style={{
                width: 52, textAlign: 'center',
                background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
                borderRadius: 4, color: 'var(--color-text)',
                padding: '3px 4px', fontSize: 14, fontFamily: 'var(--font-body)',
              }}
            />
            <button onClick={() => onProgress(popover.key, popoverHave + 1)} style={popBtn}>+</button>
          </div>
          {popover.needScaled > 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Need: {fmt(popover.needScaled)}</span>
          )}
        </div>
      )}
    </div>
  )
}

function ReqRow({ label, value, have, net, haveNote }: { label: string; value: string; have: string; net: string; haveNote?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>{value}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          มี {have}{haveNote && <span style={{ color: 'var(--color-accent-light)' }}> ({haveNote})</span>}
        </span>
        <span style={{ color: 'var(--color-warning)', fontSize: 13 }}>ขาด {net}</span>
      </span>
    </div>
  )
}

const popBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 4,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-alt)',
  color: 'var(--color-text)', fontSize: 16,
  cursor: 'pointer', fontFamily: 'var(--font-body)',
}
