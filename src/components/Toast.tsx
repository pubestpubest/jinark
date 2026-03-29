import { useEffect } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error'
  onDismiss: () => void
}

export function Toast({ message, type = 'success', onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2200)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      background: type === 'error' ? '#7f1d1d' : '#064e3b',
      color: type === 'error' ? '#fca5a5' : '#6ee7b7',
      border: `1px solid ${type === 'error' ? '#ef4444' : 'var(--color-success)'}`,
      borderRadius: 8,
      padding: '10px 18px',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 600,
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      animation: 'fadeIn 0.15s ease',
    }}>
      {message}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
