// NeuralFlow V3 — Reports Page
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

const TYPE_FILTERS = ['ALL','ALERT','AI_DECISION','REROUTE','RECOVERY','INFO'];

const TYPE_COLOR = {
  ALERT: 'var(--red)', AI_DECISION: 'var(--cyan)', REROUTE: 'var(--violet)',
  RECOVERY: 'var(--green)', INFO: 'var(--text-muted)', METRIC_SPIKE: 'var(--amber)',
};

export default function ReportsPage() {
  const events = useStore(s => s.events);
  const stats  = useStore(s => s.stats);
  const serverUptime = useStore(s => s.serverUptime);
  const [filter, setFilter]   = useState('ALL');
  const [search, setSearch]   = useState('');

  const filtered = useMemo(() => {
    let r = events;
    if (filter !== 'ALL') r = r.filter(e => e.type === filter);
    if (search) r = r.filter(e => e.message?.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [events, filter, search]);

  const aiDecisions = events.filter(e => e.type === 'AI_DECISION').length;
  const alerts      = events.filter(e => e.type === 'ALERT' && e.severity === 'CRITICAL').length;

  const handleCSV = () => {
    toast.loading('Generating CSV…', { id: 'csv' });
    try {
      const rows = filtered.map(e => [
        new Date(e.timestamp).toLocaleString(),
        e.type, e.severity || 'N/A', e.nodeId || 'N/A',
        `"${(e.message || '').replace(/"/g, '""')}"`,
      ].join(','));
      const csv = ['Timestamp,Type,Severity,Node,Message', ...rows].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `neuralflow_${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('CSV exported', { id: 'csv' });
    } catch { toast.error('Export failed', { id: 'csv' }); }
  };

  const handleJSON = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url;
    a.download = 'neuralflow_events.json'; a.click(); URL.revokeObjectURL(url);
    toast.success('JSON exported');
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 5 }}>INCIDENT REPORTS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>Event History & Export</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleCSV} style={{ height: 36, padding: '0 16px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>📄 CSV</button>
          <button onClick={handleJSON} style={{ height: 36, padding: '0 16px', borderRadius: 6, background: 'var(--cyan)', color: '#020204', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>💾 JSON</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { l: 'TOTAL EVENTS',  v: events.length,   c: 'var(--cyan)'   },
          { l: 'CRITICAL ALERTS',v: alerts,          c: 'var(--red)'    },
          { l: 'AI DECISIONS',  v: aiDecisions,      c: 'var(--violet)' },
          { l: 'AVG AI RESPONSE', v: stats.avgResponseTime != null ? `${Math.round(stats.avgResponseTime)}ms` : '—', c: 'var(--amber)' },
          { l: 'SERVER UPTIME', v: serverUptime.hours > 0 ? `${serverUptime.hours}h ${serverUptime.minutes % 60}m` : `${serverUptime.minutes}m`, c: 'var(--green)' },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {TYPE_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              height: 30, padding: '0 12px', borderRadius: 5, cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
              background: filter === f ? 'var(--cyan)' : 'var(--bg-elevated)',
              color: filter === f ? '#020204' : 'var(--text-secondary)',
              border: filter === f ? 'none' : '1px solid var(--border-light)',
              transition: 'all 0.15s',
            }}>
            {f}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search events…"
          style={{ flex: 1, minWidth: 180, height: 30, padding: '0 12px', borderRadius: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} events</span>
      </div>

      {/* Timeline */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          EVENT TIMELINE
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: '0.82rem' }}>{search ? 'No matching events' : 'No events yet'}</div>
          </div>
        ) : (
          <div style={{ position: 'relative', padding: '16px 20px' }}>
            <div style={{ position: 'absolute', left: 34, top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
            {filtered.map((ev, i) => {
              const c = TYPE_COLOR[ev.type] || 'var(--text-muted)';
              const ts = typeof ev.timestamp === 'number' ? new Date(ev.timestamp).toLocaleString() : String(ev.timestamp);
              return (
                <motion.div key={ev.id || i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  style={{ position: 'relative', paddingLeft: 52, paddingBottom: 18 }}>
                  <div style={{ position: 'absolute', left: 28, top: 2, width: 12, height: 12, borderRadius: '50%', background: c, border: '2px solid var(--bg-card)', zIndex: 1, boxShadow: `0 0 6px ${c}` }} />
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', borderLeft: `2px solid ${c}` }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{ts}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: c, padding: '1px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', letterSpacing: '0.08em' }}>{ev.type}</span>
                      {ev.nodeId && <span style={{ fontSize: '0.6rem', color: 'var(--violet)', padding: '1px 7px', borderRadius: 4, background: 'var(--violet-dim)', letterSpacing: '0.06em' }}>NODE {ev.nodeId}</span>}
                      {ev.severity && <span style={{ fontSize: '0.6rem', color: ev.severity === 'CRITICAL' ? 'var(--red)' : 'var(--text-muted)' }}>{ev.severity}</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ev.message}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
