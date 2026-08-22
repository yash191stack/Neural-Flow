import { motion, AnimatePresence } from 'framer-motion';

export default function AIDecisionSummary({ decision, completedAISession, completedManualSession }) {
  if (!decision) return null;

  const before = decision.beforeWeights || [];
  const after  = decision.afterWeights  || [];
  const comparison = decision.comparison || [];
  const reasons = decision.reasons || [];
  const alternatives = decision.alternatives || [];

  const aiTime = decision.responseTimeMs;
  const manualTime = completedManualSession?.reactionTime;

  const card = {
    background: 'var(--bg-card)',
    border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 18px',
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  };

  const sectionTitle = {
    fontSize: '0.58rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    marginBottom: 8,
    textTransform: 'uppercase',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={card}
    >
      {/* top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--cyan)' }} />

      {/* header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.06em' }}>
              AI DECISION — Node {decision.fromNodeId} → Node {decision.toNodeId}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {decision.timestamp} · {decision.environment} mode
            </div>
          </div>
        </div>
        {/* confidence + response time */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>CONFIDENCE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
              {decision.confidence}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>AI RESPONSE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#00ff88' }}>
              {aiTime}ms
            </div>
          </div>
        </div>
      </div>

      {/* main content: two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* LEFT: Why flagged + alternatives */}
        <div>
          {/* reasons */}
          <div style={sectionTitle}>WHY THIS DECISION</div>
          {reasons.map((r, i) => (
            <div key={i} style={{
              padding: '8px 10px', marginBottom: 6, borderRadius: 6,
              background: 'var(--bg-elevated)', borderLeft: '3px solid var(--cyan)',
              fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              {r}
            </div>
          ))}

          {/* alternatives evaluated */}
          {alternatives.length > 0 && (
            <div style={{ ...sectionTitle, marginTop: 10 }}>CANDIDATES EVALUATED</div>
          )}
          {alternatives.map((alt, i) => (
            <div key={i} style={{
              padding: '6px 10px', marginBottom: 4, borderRadius: 5,
              fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4,
              background: i === 0 ? 'rgba(255,51,85,0.06)' : 'transparent',
              borderLeft: i === 0 ? '2px solid var(--red)' : i === alternatives.length - 1 ? '2px solid var(--green)' : '2px solid transparent',
            }}>
              {alt}
            </div>
          ))}

          {/* comparison table */}
          {comparison.length > 0 && (
            <>
              <div style={{ ...sectionTitle, marginTop: 10 }}>NODE COMPARISON AT DECISION TIME</div>
              <div style={{ overflow: 'hidden', borderRadius: 6, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.66rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      <th style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>NODE</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>LAT</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>HP</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>RPS</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>ERR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map(n => {
                      const isFlagged = n.nodeId === decision.fromNodeId;
                      const isSelected = n.nodeId === decision.toNodeId;
                      return (
                        <tr key={n.nodeId} style={{
                          background: isSelected ? 'rgba(0,255,136,0.05)' : isFlagged ? 'rgba(255,51,85,0.05)' : 'transparent',
                          borderTop: '1px solid var(--border)',
                        }}>
                          <td style={{ padding: '5px 8px', color: isFlagged ? 'var(--red)' : isSelected ? 'var(--green)' : 'var(--text-secondary)', fontWeight: 700 }}>
                            N{n.nodeId} {isFlagged ? '⚠' : isSelected ? '✓' : ''}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: n.latency > 200 ? 'var(--red)' : 'var(--text-primary)', fontWeight: 600 }}>{n.latency}ms</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: n.health < 60 ? 'var(--red)' : 'var(--text-primary)', fontWeight: 600 }}>{n.health}%</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{n.requestsPerSecond}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: n.errorRate > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{n.errorRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Before→After weights, AI vs Manual, Savings */}
        <div>
          {/* before → after traffic weights */}
          <div style={sectionTitle}>TRAFFIC REROUTE</div>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', marginBottom: 12 }}>
            {before.map((bw, i) => {
              const aw = after.find(a => a.nodeId === bw.nodeId);
              const diff = aw ? aw.traffic - bw.traffic : 0;
              return (
                <div key={bw.nodeId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < before.length - 1 ? 6 : 0 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', width: 28 }}>N{bw.nodeId}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* before bar */}
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${bw.traffic}%`, height: '100%', background: diff < 0 ? 'var(--red)' : diff > 0 ? 'var(--green)' : 'var(--text-muted)', borderRadius: 4, opacity: 0.4, transition: 'width 0.3s' }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${aw?.traffic || 0}%`, background: diff < 0 ? 'var(--red)' : diff > 0 ? 'var(--green)' : 'var(--cyan)', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 56, textAlign: 'right' }}>
                      {bw.traffic}→{aw?.traffic ?? '?'}%
                    </span>
                  </div>
                  {diff !== 0 && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: diff > 0 ? 'var(--green)' : 'var(--red)', minWidth: 30, textAlign: 'right' }}>
                      {diff > 0 ? '+' : ''}{diff}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* TASK 2: AI vs Manual Response Time */}
          <div style={sectionTitle}>RESPONSE TIME COMPARISON</div>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: manualTime != null ? 8 : 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                AI Response
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#00ff88' }}>
                {aiTime != null ? `${aiTime}ms` : '—'}
              </span>
            </div>
            {manualTime != null ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
                  Manual Response
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>
                  {typeof manualTime === 'number' ? `${manualTime.toFixed(1)}s` : '—'}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: 6 }}>
                No manual reroute recorded in this session
              </div>
            )}
          </div>

          {/* TASK 3: Estimated Savings — Illustrative */}
          <div style={sectionTitle}>ESTIMATED IMPACT</div>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Impact avoided
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                ${(decision.estimatedSavings ?? 0).toFixed(2)}
              </span>
            </div>
            <div style={{
              marginTop: 6, padding: '3px 8px', borderRadius: 4,
              background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
              fontSize: '0.56rem', color: 'var(--text-muted)', fontStyle: 'italic',
              display: 'inline-block',
            }}>
              Illustrative estimate — not measured production data
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
