import { useState } from 'react'
import { sfx } from '../sounds'
import type { RecipeNode, ProgressMap, AltMap } from '../types'
import { getActiveChildren, calcNodeProgress } from '../utils'
import { NodeImage } from './NodeImage'
import { MiniProgressBar } from './MiniProgressBar'

const DEPTH_COLORS = ['var(--depth-0)', 'var(--depth-1)', 'var(--depth-2)', 'var(--depth-3)']

interface Props {
  node: RecipeNode
  nodeKey: string
  depth: number
  qty: number
  progress: ProgressMap
  altMap: AltMap
  onProgress: (key: string, value: number | boolean) => void
  onAlt: (key: string, idx: number) => void
}

export function RecipeNodeRow({ node, nodeKey, depth, qty, progress, altMap, onProgress, onAlt }: Props) {
  const [open, setOpen] = useState(false)

  const activeChildren = getActiveChildren(node, nodeKey, altMap)
  const isLeaf = activeChildren.length === 0
  const ratio = calcNodeProgress(node, nodeKey, qty, progress, altMap)
  const isDone = ratio >= 1
  const depthColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)]

  const needScaled = node.type === 'checkbox' ? 1 : node.need * qty
  const have = isLeaf ? ((progress[nodeKey] as number) ?? 0) : 0

  return (
    <div style={{
      borderLeft: `3px solid ${depthColor}`,
      marginLeft: depth === 0 ? 0 : 12,
      marginBottom: 4,
      borderRadius: '0 6px 6px 0',
      background: 'var(--color-surface)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={() => { if (!isLeaf) { sfx.click(); setOpen(o => !o) } }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 18px',
          cursor: isLeaf ? 'default' : 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Chevron */}
        {!isLeaf && (
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
            width: 12,
            display: 'inline-block',
          }}>▶</span>
        )}
        {isLeaf && <span style={{ width: 12 }} />}

        <NodeImage image={node.image} name={node.name} />

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block',
            fontSize: 18,
            fontWeight: 600,
            color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            {node.name}
          </span>
          {node.note && (
            <span style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 3 }}>
              {node.note}
            </span>
          )}
        </span>

        {isDone && (
          <span style={{
            fontSize: 11,
            background: 'var(--color-success)',
            color: '#fff',
            borderRadius: 4,
            padding: '1px 6px',
            fontWeight: 700,
          }}>Done</span>
        )}

        {/* Leaf input */}
        {isLeaf && node.type === 'checkbox' && (
          <input
            type="checkbox"
            checked={progress[nodeKey] === true}
            onChange={e => { sfx.click(); onProgress(nodeKey, e.target.checked) }}
            onClick={e => e.stopPropagation()}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
          />
        )}

        {isLeaf && node.type !== 'checkbox' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { sfx.click(); onProgress(nodeKey, Math.max(0, have - 1)) }} style={btnStyle}>−</button>
            <input
              type="number"
              min={0}
              value={have}
              onChange={e => onProgress(nodeKey, Math.max(0, parseInt(e.target.value) || 0))}
              style={{
                width: 66,
                textAlign: 'center',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                color: 'var(--color-text)',
                padding: '5px 4px',
                fontSize: 16,
              }}
            />
            <span style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>/ {needScaled}</span>
            <button onClick={() => { sfx.click(); onProgress(nodeKey, have + 1) }} style={btnStyle}>+</button>
          </div>
        )}

        {/* Parent: mini progress */}
        {!isLeaf && (
          <span style={{ fontSize: 15, color: 'var(--color-text-muted)', minWidth: 44, textAlign: 'right' }}>
            {Math.round(ratio * 100)}%
          </span>
        )}
      </div>

      {/* Mini bar for parents */}
      {!isLeaf && (
        <div style={{ padding: '0 10px 6px' }}>
          <MiniProgressBar ratio={ratio} />
        </div>
      )}

      {/* Alt tabs */}
      {open && node.alternatives && (
        <div style={{ display: 'flex', gap: 4, padding: '0 10px 6px' }}>
          {node.alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => { sfx.click(); onAlt(nodeKey, i) }}
              style={{
                padding: '3px 10px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                background: (altMap[nodeKey] ?? 0) === i ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                color: 'var(--color-text)',
                fontWeight: 600,
              }}
            >{alt.label}</button>
          ))}
        </div>
      )}

      {/* Children */}
      {open && activeChildren.length > 0 && (
        <div style={{ padding: '0 6px 6px' }}>
          {activeChildren.map((child, i) => (
            <RecipeNodeRow
              key={`${nodeKey}_${i}`}
              node={child}
              nodeKey={`${nodeKey}_${i}`}
              depth={depth + 1}
              qty={qty}
              progress={progress}
              altMap={altMap}
              onProgress={onProgress}
              onAlt={onAlt}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-alt)',
  color: 'var(--color-text)',
  fontSize: 20,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
