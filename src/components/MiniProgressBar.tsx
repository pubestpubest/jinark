interface Props {
  ratio: number // 0–1
}

export function MiniProgressBar({ ratio }: Props) {
  const pct = Math.round(ratio * 100)
  return (
    <div style={{
      height: 8,
      background: 'var(--color-border)',
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 4,
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: pct >= 100 ? 'var(--color-success)' : 'var(--color-accent-light)',
        borderRadius: 2,
        transition: 'width 0.2s ease',
      }} />
    </div>
  )
}
