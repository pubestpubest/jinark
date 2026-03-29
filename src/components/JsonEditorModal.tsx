import { useState } from 'react'
import type { RecipeNode } from '../types'

interface Props {
  currentRecipe: RecipeNode
  onApply: (recipe: RecipeNode) => void
  onClose: () => void
}

export function JsonEditorModal({ currentRecipe, onApply, onClose }: Props) {
  const [text, setText] = useState(() => JSON.stringify(currentRecipe, null, 2))
  const [error, setError] = useState('')

  function handleApply() {
    try {
      const parsed = JSON.parse(text) as RecipeNode
      if (!parsed.name || typeof parsed.need !== 'number') {
        setError('Invalid schema: must have "name" and "need" fields.')
        return
      }
      onApply(parsed)
    } catch (e) {
      setError(`JSON parse error: ${(e as Error).message}`)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 24,
        width: 'min(640px, 95vw)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Load Recipe JSON</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 20 }}>✕</button>
        </div>

        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setError('') }}
          spellCheck={false}
          style={{
            flex: 1,
            minHeight: 320,
            fontFamily: 'monospace',
            fontSize: 12,
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text)',
            border: `1px solid ${error ? '#ef4444' : 'var(--color-border)'}`,
            borderRadius: 6,
            padding: 10,
            resize: 'vertical',
          }}
        />

        {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Schema: <code style={{ color: 'var(--color-accent-light)' }}>{`{ name, need, type?, image?, children?, alternatives? }`}</code>
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={handleApply} style={primaryBtn}>Apply</button>
        </div>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 20px',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: 14,
}

const secondaryBtn: React.CSSProperties = {
  padding: '8px 20px',
  background: 'var(--color-surface-alt)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 14,
}
