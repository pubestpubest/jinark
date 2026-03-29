import { useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import type { RecipeNode, ProgressMap, AltMap } from './types'
import {
  loadRecipe, saveRecipe,
  loadProgress, saveProgress,
  loadQty, saveQty,
  loadAlt, saveAlt,
  resetProgress,
} from './storage'
import { collectLeafTotals } from './utils'
import { NodeImage } from './components/NodeImage'
import { sfx } from './sounds'
import { RecipeNodeRow } from './components/RecipeNodeRow'
import { InventoryGrid } from './components/InventoryGrid'
import { JsonEditorModal } from './components/JsonEditorModal'
import { Toast } from './components/Toast'
import { SimulationTab } from './components/SimulationTab'

type Tab = 'tracker' | 'simulation'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tracker')
  const [recipe, setRecipe] = useState<RecipeNode>(() => loadRecipe())
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())
  const [qty, setQty] = useState<number>(() => loadQty())
  const [altMap, setAltMap] = useState<AltMap>(() => loadAlt())
  const [showEditor, setShowEditor] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const children = recipe.children ?? []

  const totals = collectLeafTotals(children, 'root', qty, progress, altMap)
  const overallPct = totals.need > 0 ? Math.round((totals.have / totals.need) * 100) : 0

  const handleProgress = useCallback((key: string, value: number | boolean) => {
    setProgress(prev => {
      const next = { ...prev, [key]: value }
      saveProgress(next)
      return next
    })
  }, [])

  const handleAlt = useCallback((key: string, idx: number) => {
    setAltMap(prev => {
      const next = { ...prev, [key]: idx }
      saveAlt(next)
      return next
    })
  }, [])

  const handleQty = (delta: number) => {
    sfx.click()
    const next = Math.max(1, qty + delta)
    setQty(next)
    saveQty(next)
  }

  const handleApplyRecipe = (newRecipe: RecipeNode) => {
    setRecipe(newRecipe)
    saveRecipe(newRecipe)
    setProgress({})
    saveProgress({})
    setAltMap({})
    saveAlt({})
    setShowEditor(false)
    setToast({ msg: 'Recipe loaded!', type: 'success' })
  }

  const handleReset = () => {
    sfx.click()
    if (!confirmReset) { setConfirmReset(true); return }
    setProgress({})
    resetProgress()
    setConfirmReset(false)
    setToast({ msg: 'Progress reset.', type: 'success' })
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 20px' }}>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['tracker', 'simulation'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabBtn(tab === activeTab)}>
            {tab === 'tracker' ? '📋 Tracker' : '🎰 Simulation'}
          </button>
        ))}
      </div>

      {activeTab === 'simulation' && <SimulationTab />}

      {activeTab === 'tracker' && <>
      {/* Master card */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 28,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <NodeImage image={recipe.image} name={recipe.name} size={72} />
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              color: 'var(--color-accent-light)',
              lineHeight: 1.1,
            }}>
              {recipe.emoji} {recipe.name}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-text-muted)', marginTop: 6 }}>
              Craft Tracker
            </p>
          </div>

          {/* Qty scaler */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>Craft ×</span>
            <button onClick={() => handleQty(-1)} style={smallBtn}>−</button>
            <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 22 }}>{qty}</span>
            <button onClick={() => handleQty(+1)} style={smallBtn}>+</button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 17, color: 'var(--color-text-muted)' }}>Overall Progress</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: overallPct >= 100 ? 'var(--color-success)' : 'var(--color-accent-light)' }}>
              {overallPct}%
            </span>
          </div>
          <div style={{ height: 18, background: 'var(--color-border)', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${overallPct}%`,
              background: overallPct >= 100 ? 'var(--color-success)' : 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))',
              borderRadius: 9,
              transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left — Recipe tree */}
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={() => { sfx.click(); setShowEditor(true) }} style={controlBtn}>📋 Load Recipe</button>
            <button
              onClick={handleReset}
              style={{ ...controlBtn, ...destructiveBtn, ...(confirmReset ? confirmingBtn : {}) }}
            >
              {confirmReset ? '⚠️ Confirm Reset?' : '🔄 Reset Progress'}
            </button>
            {confirmReset && (
              <button onClick={() => { sfx.click(); setConfirmReset(false) }} style={controlBtn}>Cancel</button>
            )}
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--color-text-muted)',
            marginBottom: 14,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            Recipe
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {children.map((child, i) => (
              <RecipeNodeRow
                key={`root_${i}`}
                node={child}
                nodeKey={`root_${i}`}
                depth={0}
                qty={qty}
                progress={progress}
                altMap={altMap}
                onProgress={handleProgress}
                onAlt={handleAlt}
              />
            ))}
          </div>
        </div>

        {/* Right — Inventory */}
        <div style={{
          flex: '0 0 460px',
          position: 'sticky',
          top: 20,
        }}>
          <InventoryGrid
            recipeChildren={children}
            progress={progress}
            qty={qty}
            altMap={altMap}
            onProgress={handleProgress}
          />
        </div>
      </div>

      {showEditor && (
        <JsonEditorModal
          currentRecipe={recipe}
          onApply={handleApplyRecipe}
          onClose={() => setShowEditor(false)}
        />
      )}

      {toast && (
        <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
      )}
      </>}

    </div>
  )
}

function tabBtn(active: boolean): CSSProperties {
  return {
    padding: '12px 30px', borderRadius: 12, fontSize: 18, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    background: active ? 'var(--color-accent)' : 'var(--color-surface)',
    color: active ? '#fff' : 'var(--color-text-muted)',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    transition: 'all 0.15s',
  }
}

const smallBtn: CSSProperties = {
  width: 40, height: 40,
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-alt)',
  color: 'var(--color-text)',
  fontSize: 22,
}

const controlBtn: CSSProperties = {
  padding: '11px 22px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 600,
}

const destructiveBtn: CSSProperties = {
  background: '#450a0a',
  color: '#fca5a5',
  borderColor: '#b91c1c',
}

const confirmingBtn: CSSProperties = {
  background: '#7f1d1d',
  borderColor: '#ef4444',
  color: '#fecaca',
}
