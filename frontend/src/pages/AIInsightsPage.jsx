// NeuralFlow V3 - AI Insights Page with Neural Network Visualization
import { useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

export default function AIInsightsPage() {
  const lastAIDecision = useStore(state => state.lastAIDecision);
  const modelPerformance = useStore(state => state.modelPerformance);
  const [showExplainer, setShowExplainer] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);

  const handleRetrain = async () => {
    setIsRetraining(true);
    toast.loading('Retraining neural network...', { id: 'retrain' });

    try {
      const response = await fetch(`${API_URL}/api/model/retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples: 500 })
      });

      if (response.ok) {
        toast.success('Model retrained successfully!', { id: 'retrain' });
      } else {
        toast.error('Failed to retrain model', { id: 'retrain' });
      }
    } catch (error) {
      toast.error('Backend connection error', { id: 'retrain' });
    } finally {
      setIsRetraining(false);
    }
  };

  const handleExportModel = async () => {
    try {
      const response = await fetch(`${API_URL}/api/model/export`);
      const data = await response.json();

      const dataStr = JSON.stringify(data.model, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'neuralflow_model.json';
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Model exported successfully!');
    } catch (error) {
      toast.error('Failed to export model');
    }
  };

  // Mock feature importance (in real app, this comes from feature attribution)
  const featureImportance = [
    { feature: 'Latency Trend', importance: 34 },
    { feature: 'Queue Size', importance: 28 },
    { feature: 'Error Rate', importance: 21 },
    { feature: 'CPU Usage', importance: 12 },
    { feature: 'Memory Usage', importance: 5 }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          marginBottom: 8,
          color: 'var(--text-primary)'
        }}>
          AI Insights & Analysis
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem'
        }}>
          Neural network performance and decision transparency
        </p>
      </div>

      {/* Latest Decision Hero Card */}
      {lastAIDecision && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(0,255,209,0.1), rgba(124,58,237,0.1))',
            border: '2px solid var(--accent-primary)',
            borderRadius: 16,
            padding: 32,
            marginBottom: 32
          }}
        >
          <div style={{
            fontSize: '0.9rem',
            color: 'var(--accent-primary)',
            fontWeight: 700,
            marginBottom: 16
          }}>
            ⚡ LATEST AI DECISION
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 20,
            flexWrap: 'wrap'
          }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 800,
              color: 'var(--text-primary)'
            }}>
              Node {lastAIDecision.fromNodeId}
            </div>

            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: '2rem' }}
            >
              →
            </motion.div>

            <div style={{
              fontSize: '3rem',
              fontWeight: 800,
              color: 'var(--accent-success)'
            }}>
              Node {lastAIDecision.toNodeId}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 16,
            marginBottom: 20
          }}>
            <MetricBadge
              label="Confidence"
              value={`${lastAIDecision.confidence}%`}
              color="var(--accent-primary)"
            />
            <MetricBadge
              label="Response Time"
              value={`${lastAIDecision.responseTimeMs}ms`}
              color="var(--accent-success)"
            />
            <MetricBadge
              label="Attack Probability"
              value={`${lastAIDecision.attackProbability}%`}
              color="var(--accent-danger)"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowExplainer(!showExplainer)}
            style={{
              padding: '10px 20px',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: 8,
              color: '#0a0b0f',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {showExplainer ? 'Hide' : 'View'} Full Analysis
          </motion.button>

          {showExplainer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: 20,
                padding: 20,
                background: 'var(--bg-card)',
                borderRadius: 12
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                Decision Reasoning
              </h4>
              <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
                {/* backend/store payload uses `reasons`, not `reasoning` */}
                {(lastAIDecision.reasons || lastAIDecision.reasoning || []).map((reason, i) => (
                  <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {reason}
                  </li>
                ))}
              </ul>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginTop: 20, marginBottom: 12 }}>
                Alternatives Considered
              </h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {/* alternatives are plain strings in the actual payload */}
                {(lastAIDecision.alternatives || []).map((alt, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {typeof alt === 'string' ? alt : alt.name || JSON.stringify(alt)}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* AI Model Performance */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth >= 1200 ? 'repeat(2, 1fr)' : '1fr',
        gap: 24,
        marginBottom: 24
      }}>
        {/* Performance Gauges */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            padding: 24
          }}
        >
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            marginBottom: 20
          }}>
            📊 Model Performance
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20
          }}>
            <GaugeCard label="Accuracy" value={modelPerformance.accuracy || 0} />
            <GaugeCard
              label="Precision"
              value={modelPerformance.predictionCount > 0
                ? Math.round(((modelPerformance.predictionCount - (modelPerformance.falsePositives || 0)) / modelPerformance.predictionCount) * 100)
                : null}
            />
            <GaugeCard
              label="Recall"
              value={null}
              placeholder="Session data"
            />
            <GaugeCard
              label="F1 Score"
              value={null}
              placeholder="Session data"
            />
          </div>

          <div style={{
            marginTop: 24,
            padding: 16,
            background: 'var(--bg-secondary)',
            borderRadius: 8
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Training Status
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
              {modelPerformance.isTraining ? 'Training in progress...' : 'Ready'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Predictions Made: {modelPerformance.predictionCount || 0}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Training Error: {modelPerformance.lastTrainingError?.toFixed(6) || 'N/A'}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 20
          }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetrain}
              disabled={isRetraining}
              style={{
                flex: 1,
                padding: '12px',
                background: isRetraining ? 'var(--bg-secondary)' : 'var(--accent-warning)',
                border: 'none',
                borderRadius: 8,
                color: isRetraining ? 'var(--text-secondary)' : '#0a0b0f',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: isRetraining ? 'not-allowed' : 'pointer'
              }}
            >
              {isRetraining ? '⏳ Retraining...' : '🔄 Retrain Model'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportModel}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--accent-primary)',
                border: 'none',
                borderRadius: 8,
                color: '#0a0b0f',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              💾 Export Model
            </motion.button>
          </div>
        </motion.div>

        {/* Feature Importance */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            padding: 24
          }}
        >
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            marginBottom: 20
          }}>
            🎯 Feature Importance
          </h3>

          <div style={{ marginBottom: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Which metrics drive AI decisions:
          </div>

          {featureImportance.map((item, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: '0.9rem'
              }}>
                <span>{item.feature}</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {item.importance}%
                </span>
              </div>
              <div style={{
                height: 8,
                background: 'var(--bg-secondary)',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.importance}%` }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                    borderRadius: 4
                  }}
                />
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Neural Network Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24
        }}
      >
        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: 20
        }}>
          🧠 Neural Network Architecture
        </h3>

        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '40px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          flexWrap: 'wrap',
          gap: 40
        }}>
          {/* Input Layer */}
          <LayerVis title="Input" nodes={9} label="9 Features" />

          <ArrowVis label="Dense" />

          {/* Hidden Layer 1 */}
          <LayerVis title="Hidden 1" nodes={12} label="12 Neurons" />

          <ArrowVis label="Leaky ReLU" />

          {/* Hidden Layer 2 */}
          <LayerVis title="Hidden 2" nodes={8} label="8 Neurons" />

          <ArrowVis label="Leaky ReLU" />

          {/* Hidden Layer 3 */}
          <LayerVis title="Hidden 3" nodes={6} label="6 Neurons" />

          <ArrowVis label="Softmax" />

          {/* Output Layer */}
          <LayerVis title="Output" nodes={3} label="3 Classes" />
        </div>

        {/* Process Steps */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginTop: 24
        }}>
          <ProcessStep number="1" label="Detect" description="Monitor metrics" />
          <ProcessStep number="2" label="Analyze" description="Run prediction" />
          <ProcessStep number="3" label="Decide" description="Select action" />
          <ProcessStep number="4" label="Execute" description="Reroute traffic" />
          <ProcessStep number="5" label="Learn" description="Update model" />
        </div>
      </motion.div>

      {/* Active Playbook */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          padding: 24
        }}
      >
        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: 20
        }}>
          📚 Active Playbooks
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16
        }}>
          <PlaybookCard
            name="Isolate & Reroute"
            description="Primary response for critical attacks"
            active={true}
          />
          <PlaybookCard
            name="Load Balance"
            description="Distribute traffic across healthy nodes"
            active={false}
          />
          <PlaybookCard
            name="Gradual Recovery"
            description="Slowly restore attacked node to service"
            active={false}
          />
        </div>
      </motion.div>
    </div>
  );
}

// Helper Components
function MetricBadge({ label, value, color }) {
  return (
    <div style={{
      padding: 12,
      background: 'var(--bg-secondary)',
      borderRadius: 8,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}

function GaugeCard({ label, value, placeholder = 'N/A' }) {
  const hasValue = value !== null && value !== undefined;
  const percentage = hasValue ? Math.min(value, 100) : 0;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="100" height="100">
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="var(--bg-secondary)"
          strokeWidth="8"
          fill="none"
        />
        {hasValue && (
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="var(--accent-primary)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
            transform="rotate(-90 50 50)"
            strokeLinecap="round"
          />
        )}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dy=".3em"
          style={{
            fontSize: hasValue ? '1.3rem' : '0.65rem',
            fontWeight: 800,
            fill: hasValue ? 'var(--text-primary)' : 'var(--text-muted)'
          }}
        >
          {hasValue ? `${percentage.toFixed(0)}%` : placeholder}
        </text>
      </svg>
      <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginTop: 8
      }}>
        {label}
      </div>
    </div>
  );
}

function LayerVis({ title, nodes, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginBottom: 8
      }}>
        {title}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
        {Array.from({ length: Math.min(nodes, 5) }, (_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              boxShadow: '0 0 10px var(--accent-primary)'
            }}
          />
        ))}
        {nodes > 5 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            +{nodes - 5}
          </div>
        )}
      </div>
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--accent-primary)',
        marginTop: 8,
        fontWeight: 600
      }}>
        {label}
      </div>
    </div>
  );
}

function ArrowVis({ label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <motion.div
        animate={{ x: [0, 5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ fontSize: '2rem' }}
      >
        →
      </motion.div>
      <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-secondary)',
        marginTop: 4
      }}>
        {label}
      </div>
    </div>
  );
}

function ProcessStep({ number, label, description }) {
  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-secondary)',
      borderRadius: 8,
      textAlign: 'center'
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--accent-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 8px',
        fontSize: '1rem',
        fontWeight: 800,
        color: '#0a0b0f'
      }}>
        {number}
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {description}
      </div>
    </div>
  );
}

function PlaybookCard({ name, description, active }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      style={{
        padding: 16,
        background: active ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)',
        border: `2px solid ${active ? 'var(--accent-success)' : 'var(--border-subtle)'}`,
        borderRadius: 12,
        cursor: 'pointer'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 700 }}>
          {name}
        </div>
        {active && (
          <div style={{
            padding: '2px 8px',
            background: 'var(--accent-success)',
            borderRadius: 12,
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#0a0b0f'
          }}>
            ACTIVE
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {description}
      </div>
    </motion.div>
  );
}
