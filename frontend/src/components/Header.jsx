export default function Header({ mode, onModeSwitch, onReset, attackActive, nodeCount }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderRadius: 12, marginBottom: 16,
      background: 'var(--bg-surface)', border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--neon-blue)', letterSpacing: 1 }}>
          🧠 NEURALFLOW V2
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {nodeCount} nodes online
        </span>
        {attackActive && (
          <span style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: 'rgba(255,34,68,0.15)', color: 'var(--neon-red)',
            border: '1px solid var(--neon-red)', animation: 'pulse 1s infinite'
          }}>
            ⚔️ UNDER ATTACK
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>MODE:</span>
        {['manual', 'ai'].map(m => (
          <button key={m} onClick={() => onModeSwitch(m)} style={{
            padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s',
            background: mode === m
              ? m === 'manual' ? 'rgba(255,204,0,0.15)' : 'rgba(0,212,255,0.15)'
              : 'transparent',
            color: mode === m
              ? m === 'manual' ? 'var(--neon-yellow)' : 'var(--neon-blue)'
              : 'var(--text-muted)',
            border: `1px solid ${mode === m
              ? m === 'manual' ? 'var(--neon-yellow)' : 'var(--neon-blue)'
              : 'var(--border)'}`
          }}>
            {m === 'manual' ? '👤 MANUAL' : '🤖 AI MODE'}
          </button>
        ))}
        <button onClick={onReset} style={{
          padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          background: 'rgba(255,107,53,0.1)', color: 'var(--neon-orange)',
          border: '1px solid rgba(255,107,53,0.4)', marginLeft: 8
        }}>
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
