import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const ATTACKS = [
  { id: 'ddos',      label: '🔴 DDoS Flood',      desc: 'High volume requests' },
  { id: 'spike',     label: '🟡 Traffic Spike',    desc: 'Sudden burst load'   },
  { id: 'slowloris', label: '🟠 Slow Loris',        desc: 'Connection exhaustion' }
];

export default function AttackConsole({ nodes, onReset }) {
  const [type,       setType]       = useState('ddos');
  const [targetId,   setTargetId]   = useState(1);
  const [intensity,  setIntensity]  = useState(70);
  const [duration,   setDuration]   = useState(30);
  const [attacking,  setAttacking]  = useState(false);
  const [countdown,  setCountdown]  = useState(0);

  const launch = async () => {
    setAttacking(true);
    setCountdown(duration);
    await axios.post(`${API_URL}/api/attack/start`, {
      type, targetNodeId: targetId, intensity, duration
    });
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(iv); setAttacking(false); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const stop = async () => {
    await axios.post(`${API_URL}/api/attack/stop`);
    setAttacking(false); setCountdown(0);
  };

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid var(--border)'
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-orange)', marginBottom: 12 }}>
        ⚙️ ATTACK CONSOLE
      </div>

      {/* Attack type */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Attack Type:</div>
        {ATTACKS.map(a => (
          <div key={a.id} onClick={() => !attacking && setType(a.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              borderRadius: 8, marginBottom: 4, fontSize: 12,
              cursor: attacking ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              background: type === a.id ? 'rgba(255,107,53,0.12)' : 'transparent',
              border: `1px solid ${type === a.id ? 'var(--neon-orange)' : 'var(--border)'}`
            }}>
            <span>{a.label}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>— {a.desc}</span>
          </div>
        ))}
      </div>

      {/* Target + Intensity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Target Node:</div>
          <select value={targetId} onChange={e => setTargetId(Number(e.target.value))}
            disabled={attacking}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: 8, fontSize: 12,
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', cursor: 'pointer'
            }}>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            Intensity: {intensity}%
          </div>
          <input type="range" min="30" max="100" value={intensity}
            onChange={e => setIntensity(Number(e.target.value))}
            disabled={attacking} style={{ width: '100%' }} />
        </div>
      </div>

      {/* Duration */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          Duration: {duration}s
        </div>
        <input type="range" min="10" max="60" value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          disabled={attacking} style={{ width: '100%' }} />
      </div>

      {/* Progress bar */}
      {attacking && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(255,34,68,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: 'var(--neon-red)', fontWeight: 700 }}>🔴 ATTACK ACTIVE</span>
            <span style={{ color: 'var(--neon-red)' }}>{countdown}s remaining</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 4, height: 4 }}>
            <div style={{
              height: 4, borderRadius: 4, background: 'var(--neon-red)', transition: 'width 1s',
              width: `${(countdown / duration) * 100}%`
            }} />
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!attacking ? (
          <button onClick={launch} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', background: 'rgba(255,34,68,0.15)',
            color: 'var(--neon-red)', border: '1px solid var(--neon-red)'
          }}>
            ▶ LAUNCH ATTACK
          </button>
        ) : (
          <button onClick={stop} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', background: 'rgba(255,107,53,0.15)',
            color: 'var(--neon-orange)', border: '1px solid var(--neon-orange)'
          }}>
            ⏹ STOP
          </button>
        )}
        <button onClick={onReset} style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
          background: 'var(--bg-surface)', color: 'var(--text-muted)',
          border: '1px solid var(--border)'
        }}>↺</button>
      </div>
    </div>
  );
}
