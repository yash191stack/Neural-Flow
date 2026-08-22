// NeuralFlow V3 — Live Monitor Page
import { useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

import { API_URL } from '../config';
async function apiCall(path, method, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API_URL}${path}`, opts);
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.message.includes('fetch') || err.name === 'TypeError') {
      throw new Error(`NeuralFlow backend is unavailable on port 3001.`);
    }
    throw err;
  }
}

export default function MonitoringPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [attackType, setAttackType]     = useState('TrafficSpike');
  const [targetNode, setTargetNode]     = useState(1);

  const nodes             = useStore(s => s.nodes);
  const events            = useStore(s => s.events);
  const systemHealthScore = useStore(s => s.getSystemHealthScore());
  const statusSummary     = useStore(s => s.getStatusSummary());
  const incident          = useStore(s => s.incident);

  const handleLaunch = async () => {
    try {
      await apiCall('/api/attack/start', 'POST', { nodeId: targetNode, attackType, intensity: 60 });
      toast.loading(`${attackType} launched on Node ${targetNode}`, { duration: 2000, icon: '🚀' });
    } catch (e) { toast.error(`Launch failed: ${e.message}`); }
  };

  const handleStop = async () => {
    try {
      await apiCall('/api/attack/stop', 'POST');
      toast.success('Traffic contained', { icon: '⏹' });
    } catch (e) { toast.error(`Stop failed: ${e.message}`); }
  };

  const healthColor = systemHealthScore > 70 ? 'var(--green)' : systemHealthScore > 40 ? 'var(--amber)' : 'var(--red)';

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: '0.62rem', color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 5 }}>
          LIVE MONITORING
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Infrastructure Node Health
        </div>
      </div>

      {/* System health bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18,
      }}>
        {[
          { label: 'SYSTEM HEALTH', value: `${systemHealthScore}%`, color: healthColor },
          { label: 'HEALTHY',       value: statusSummary.healthy,   color: 'var(--green)' },
          { label: 'WARNING',       value: statusSummary.warning,   color: 'var(--amber)' },
          { label: 'CRITICAL',      value: statusSummary.critical,  color: 'var(--red)'   },
        ].map(c => (
          <div key={c.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Incident state badge */}
      {incident.state !== 'NORMAL' && (
        <div style={{
          marginBottom: 14, padding: '10px 16px', borderRadius: 8,
          background: 'rgba(255,51,85,0.06)', border: '1px solid rgba(255,51,85,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 6px var(--red)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red)', letterSpacing: '0.06em' }}>
            INCIDENT ACTIVE · {incident.state.replace('_', ' ')}
          </span>
          {incident.nodeId && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              · Node {incident.nodeId} {incident.targetNodeId ? `→ Node ${incident.targetNodeId}` : ''}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Node grid */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '16px',
        }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 14 }}>
            NODE GRID · {nodes.length} NODES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            {nodes.map(node => {
              const st = (node.status || 'healthy').toLowerCase();
              const color = st === 'critical' ? 'var(--red)' : st === 'warning' ? 'var(--amber)' : 'var(--green)';
              return (
                <motion.div key={node.nodeId} whileHover={{ y: -3 }}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    background: 'var(--bg-elevated)', cursor: 'pointer',
                    border: `1px solid ${node.isUnderAttack ? 'rgba(255,51,85,0.3)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 14px',
                    boxShadow: node.isUnderAttack ? '0 0 20px rgba(255,51,85,0.1)' : 'none',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>NODE {String(node.nodeId).padStart(2,'0')}</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{node.name}</div>
                    </div>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { l: 'LATENCY', v: `${node.latency}ms` },
                      { l: 'HEALTH',  v: `${node.health}%` },
                      { l: 'TRAFFIC', v: `${node.traffic}%` },
                    ].map(m => (
                      <div key={m.l}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{m.l}</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Attack console */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
              LOAD GENERATOR
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 5 }}>ATTACK TYPE</div>
              <select value={attackType} onChange={e => setAttackType(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                <option value="TrafficSpike">Traffic Spike</option>
                <option value="DDoS">DDoS Flood</option>
                <option value="SlowLoris">Slow Loris</option>
                <option value="MemoryLeak">Memory Leak</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 5 }}>TARGET NODE</div>
              <select value={targetNode} onChange={e => setTargetNode(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                {nodes.map(n => <option key={n.nodeId} value={n.nodeId}>Node {n.nodeId} — {n.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={handleLaunch} style={{ height: 36, borderRadius: 6, background: 'var(--red)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: 'none', letterSpacing: '0.06em' }}>🚀 LAUNCH</button>
              <button onClick={handleStop} style={{ height: 36, borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border-light)', letterSpacing: '0.06em' }}>⏹ STOP</button>
            </div>
          </div>

          {/* Mini event log */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px',
            flex: 1, maxHeight: 340, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>RECENT EVENTS</div>
            <div style={{ overflowY: 'auto', flex: 1 }} className="thin-scroll">
              {events.slice(0, 20).map((ev, i) => (
                <div key={ev.id || i} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0, minWidth: 58 }}>
                    {typeof ev.timestamp === 'number' ? new Date(ev.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : String(ev.timestamp).slice(0, 8)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{ev.message}</span>
                </div>
              ))}
              {events.length === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: 20 }}>No events yet</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Node detail modal */}
      {selectedNode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setSelectedNode(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', padding: '24px', maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 3 }}>NODE {String(selectedNode.nodeId).padStart(2,'0')}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedNode.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedNode.location}</div>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { l: 'Status',     v: selectedNode.status },
                { l: 'Health',     v: `${selectedNode.health}%` },
                { l: 'Latency',    v: `${selectedNode.latency}ms` },
                { l: 'RPS',        v: selectedNode.requestsPerSecond },
                { l: 'CPU',        v: `${selectedNode.cpu?.toFixed(1)}%` },
                { l: 'Memory',     v: `${selectedNode.memory?.toFixed(0)}MB` },
                { l: 'Error Rate', v: `${selectedNode.errorRate}%` },
                { l: 'Traffic',    v: `${selectedNode.traffic}%` },
              ].map(m => (
                <div key={m.l} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 7 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 3 }}>{m.l}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
