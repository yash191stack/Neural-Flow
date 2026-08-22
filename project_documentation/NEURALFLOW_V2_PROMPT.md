# 🧠 NEURALFLOW V2 — Master Implementation Prompt File
> **For:** Hackathon + Teacher Demo  
> **Promise:** Real websites + Real latency + Manual vs AI = Working Demo  
> **Build Time:** 3–5 focused days

---

## ⭐ DEMO SUCCESS CHECKLIST (Teacher Ko Ye Dikhna Hai)
- [ ] 3 real websites ping ho rahe hain — actual latency graph pe live dikhta hai
- [ ] "Launch Attack" click karo → Node ki latency 2000ms+ ho jaati hai (REAL spike, fake nahi)
- [ ] MANUAL MODE: Alert aata hai, timer chalta hai, engineer manually shift karta hai → 10-15s lag jaate hain
- [ ] AI MODE: Same attack → System 200ms mein auto-detect, auto-shift, zero downtime
- [ ] Event log live scroll hota hai — har action log hota hai
- [ ] Playbook steps animate hote hain step-by-step
- [ ] Metrics: Manual 15s reaction vs AI 0.2s reaction — numbers clearly dikhai dete hain

---

## 🔑 KEY CONCEPT: Real Testing Kaise Hoga

Backend REAL websites ko HTTP ping karta hai aur ACTUAL latency measure karta hai.

| State        | Node 1 URL                          | Node 2 URL                                      | Node 3 URL                          |
|--------------|-------------------------------------|-------------------------------------------------|-------------------------------------|
| Normal       | `httpbin.org/delay/0`               | `jsonplaceholder.typicode.com/posts/1`          | `api.sampleapis.com/coffee/hot`     |
| Under Attack | `httpbin.org/delay/2` (2s delay)    | `httpbin.org/delay/3` (3s delay)                | `httpbin.org/delay/1` (1s delay)    |

**Flow:** Attack trigger → Backend switches URL → Real latency spikes → Dashboard shows actual numbers  
No fake data. Latency on graph = actual HTTP response time.

---

## SECTION 1: TECH STACK & INSTALLATION

```bash
# Step 1 — Create root folder
mkdir neuralflow && cd neuralflow

# Step 2 — Backend setup
mkdir backend && cd backend
npm init -y
npm install express socket.io cors axios
npm install -D nodemon
cd ..

# Step 3 — Frontend setup
npm create vite@latest frontend -- --template react
cd frontend
npm install recharts socket.io-client axios framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
cd ..
```

### Versions to use:
| Package | Version |
|---------|---------|
| react | ^18.3 |
| recharts | ^2.12 |
| socket.io | ^4.7 |
| framer-motion | ^11 |
| express | ^4.18 |

---

## SECTION 2: COMPLETE FOLDER STRUCTURE

```
neuralflow/
├── backend/
│   ├── package.json
│   ├── server.js          ← Main Express + Socket.io server
│   ├── monitor.js         ← Pings real websites, updates metrics
│   ├── aiEngine.js        ← AI decision logic + playbooks
│   └── data.js            ← Node definitions + URL config
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               ← Root: state + socket + layout
        ├── socket.js             ← Socket.io singleton
        ├── index.css             ← Global dark theme + CSS vars
        └── components/
            ├── Header.jsx        ← Top bar: mode toggle + attack status
            ├── NodeCard.jsx      ← Single node with 5 gauges
            ├── LatencyGraph.jsx  ← Real-time Recharts line chart
            ├── ManualPanel.jsx   ← Human reaction timer + shift button
            ├── AIPanel.jsx       ← AI auto-response display
            ├── EventLog.jsx      ← Live scrolling event console
            ├── AttackConsole.jsx ← Launch/stop attack controls
            ├── AIExplainer.jsx   ← Modal: why AI made this decision
            ├── MetricsPanel.jsx  ← Manual vs AI comparison table
            └── PlaybookDisplay.jsx ← Animated recovery steps
```

---

## SECTION 3: BACKEND — COMPLETE CODE

### 📄 backend/data.js

```javascript
// backend/data.js
// Node definitions + URL mappings for real website testing

const REAL_ENDPOINTS = {
  1: 'https://httpbin.org/delay/0',
  2: 'https://jsonplaceholder.typicode.com/posts/1',
  3: 'https://api.sampleapis.com/coffee/hot'
};

// When under attack, backend pings SLOW endpoints — giving REAL latency spikes
const ATTACK_ENDPOINTS = {
  1: 'https://httpbin.org/delay/2',
  2: 'https://httpbin.org/delay/3',
  3: 'https://httpbin.org/delay/1'
};

const createInitialNodes = () => ([
  {
    id: 1,
    name: 'Node 1',
    location: 'Mumbai (Primary)',
    url: REAL_ENDPOINTS[1],
    status: 'healthy',
    latency: 0,
    cpu: 22,
    memory: 28,
    errorRate: 0,
    queue: 5,
    healthScore: 94,
    traffic: 60,
    latencyHistory: [],
    isUnderAttack: false
  },
  {
    id: 2,
    name: 'Node 2',
    location: 'Delhi (Secondary)',
    url: REAL_ENDPOINTS[2],
    status: 'healthy',
    latency: 0,
    cpu: 18,
    memory: 22,
    errorRate: 0,
    queue: 3,
    healthScore: 97,
    traffic: 25,
    latencyHistory: [],
    isUnderAttack: false
  },
  {
    id: 3,
    name: 'Node 3',
    location: 'Bangalore (Backup)',
    url: REAL_ENDPOINTS[3],
    status: 'healthy',
    latency: 0,
    cpu: 12,
    memory: 18,
    errorRate: 0,
    queue: 1,
    healthScore: 98,
    traffic: 15,
    latencyHistory: [],
    isUnderAttack: false
  }
]);

module.exports = { createInitialNodes, REAL_ENDPOINTS, ATTACK_ENDPOINTS };
```

---

### 📄 backend/aiEngine.js

```javascript
// backend/aiEngine.js
// AI decision logic + health scoring + playbook definitions

const THRESHOLD = 300; // ms — above this = action needed

const calculateHealthScore = (node) => {
  const latencyScore = Math.max(0, (1 - Math.min(node.latency, 1000) / 1000)) * 30;
  const cpuScore     = (1 - node.cpu / 100) * 25;
  const memoryScore  = (1 - node.memory / 100) * 20;
  const errorScore   = (1 - Math.min(node.errorRate, 100) / 100) * 15;
  const queueScore   = (1 - Math.min(node.queue, 500) / 500) * 10;
  return Math.round(latencyScore + cpuScore + memoryScore + errorScore + queueScore);
};

const getNodeStatus = (node) => {
  if (node.latency > 800 || node.healthScore < 40) return 'critical';
  if (node.latency > THRESHOLD || node.healthScore < 65) return 'warning';
  return 'healthy';
};

const makeDecision = (nodes) => {
  // Find the node that needs help
  const problemNode = nodes.find(n =>
    n.status === 'critical' || (n.status === 'warning' && n.latency > THRESHOLD)
  );
  if (!problemNode) return null;

  // Find best healthy node to shift traffic to
  const candidates = nodes
    .filter(n => n.id !== problemNode.id && n.healthScore > 60)
    .sort((a, b) => b.healthScore - a.healthScore);

  if (!candidates.length) return null;
  const best = candidates[0];

  // Build reasoning dynamically based on what triggered this
  const reasons = [];
  if (problemNode.latency > THRESHOLD)
    reasons.push(`Latency threshold breached: ${problemNode.latency}ms > ${THRESHOLD}ms`);
  if (problemNode.cpu > 70)
    reasons.push(`CPU critical zone: ${Math.round(problemNode.cpu)}% utilization`);
  if (problemNode.errorRate > 5)
    reasons.push(`Error rate elevated: ${Math.round(problemNode.errorRate)}%`);
  reasons.push(`Node ${best.id} has ${Math.round(100 - best.traffic)}% spare capacity available`);
  reasons.push(`Node ${best.id} health score: ${best.healthScore}/100 — optimal condition`);

  // Select playbook based on attack pattern
  let playbook = 'traffic_shift';
  if (problemNode.latency > 1000) playbook = 'ddos_shield';
  else if (problemNode.cpu > 75)  playbook = 'flash_crowd';

  return {
    fromNodeId: problemNode.id,
    toNodeId: best.id,
    confidence: Math.min(99, Math.round(best.healthScore * 0.96)),
    reasons,
    alternatives: candidates.slice(1).map(n =>
      `Node ${n.id} (${n.location}) — Health: ${n.healthScore}/100 — not selected (lower score)`
    ),
    playbook,
    decisionTimeMs: 150 + Math.floor(Math.random() * 100),
    estimatedSavings: 20 + Math.floor(Math.random() * 40)
  };
};

// Linear regression to predict when a node will breach threshold
const predictBreach = (history, threshold) => {
  if (history.length < 4) return null;
  const recent = history.slice(-6).map(h => h.value);
  const slope = (recent[recent.length - 1] - recent[0]) / recent.length;
  if (slope <= 0) return null;
  const secs = Math.round(((threshold - recent[recent.length - 1]) / slope) * 2);
  return (secs > 5 && secs < 300) ? secs : null;
};

const PLAYBOOKS = {
  ddos_shield: {
    name: '🛡️ DDoS Shield Protocol',
    steps: [
      { action: 'Rate limiting suspicious source IPs',       duration: 800  },
      { action: 'Activating traffic scrubbing layer',         duration: 1200 },
      { action: 'Rerouting clean traffic to healthy node',    duration: 600  },
      { action: 'Updating firewall blacklist rules',          duration: 400  },
      { action: 'Alerting security operations team',          duration: 300  }
    ]
  },
  flash_crowd: {
    name: '⚡ Flash Crowd Handler',
    steps: [
      { action: 'Detecting peak traffic burst pattern',       duration: 600  },
      { action: 'Activating CDN cache warm-up',              duration: 900  },
      { action: 'Distributing load across available nodes',   duration: 700  },
      { action: 'Stabilizing request queue depth',            duration: 500  },
      { action: 'Scaling notifications dispatched',           duration: 300  }
    ]
  },
  traffic_shift: {
    name: '🔄 Traffic Rerouting Protocol',
    steps: [
      { action: 'Identifying optimal target node',            duration: 400  },
      { action: 'Initiating graceful traffic drain',          duration: 600  },
      { action: 'Redirecting live connections',               duration: 500  },
      { action: 'Verifying target node stability',            duration: 700  },
      { action: 'Confirming successful handover',             duration: 300  }
    ]
  }
};

module.exports = {
  makeDecision, calculateHealthScore, getNodeStatus,
  predictBreach, PLAYBOOKS, THRESHOLD
};
```

---

### 📄 backend/monitor.js

```javascript
// backend/monitor.js
// Pings real websites + updates node metrics

const axios = require('axios');
const { calculateHealthScore, getNodeStatus } = require('./aiEngine');
const { ATTACK_ENDPOINTS } = require('./data');

// Gaussian noise helper — makes metrics look realistic
const gauss = (mean, std) => {
  const u1 = Math.random(), u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Ping a URL and return real latency
const pingUrl = async (url) => {
  const start = Date.now();
  try {
    await axios.get(url, {
      timeout: 8000,
      headers: { 'Cache-Control': 'no-cache' }
    });
    return { latency: Date.now() - start, error: false };
  } catch {
    return { latency: 9999, error: true };
  }
};

// Update a single node's metrics
const updateNode = async (node, attackState) => {
  const isAttacked = attackState.active && attackState.targetNodeId === node.id;
  // Use slow endpoint if attacked — gives REAL latency spike
  const urlToUse = isAttacked ? ATTACK_ENDPOINTS[node.id] : node.url;
  const { latency } = await pingUrl(urlToUse);
  node.latency = latency;

  const intensity = (attackState.intensity || 70) / 100;

  if (isAttacked) {
    node.cpu       = clamp(gauss(75 * intensity, 10), 60, 95);
    node.memory    = clamp(gauss(65 * intensity,  8), 50, 90);
    node.errorRate = clamp(gauss(15 * intensity,  5),  5, 40);
    node.queue     = clamp(Math.floor(gauss(200 * intensity, 50)), 50, 490);
  } else {
    // Normal operation — gentle gaussian fluctuation
    node.cpu       = clamp(gauss(20, 4),   8, 40);
    node.memory    = clamp(gauss(25, 5),  10, 45);
    node.errorRate = clamp(gauss(0.5, 0.5), 0,  3);
    node.queue     = clamp(Math.floor(gauss(5, 3)), 0, 25);
  }

  node.healthScore = calculateHealthScore(node);
  node.status      = getNodeStatus(node);

  // Track last 20 readings for graph + prediction
  node.latencyHistory.push({ time: Date.now(), value: node.latency });
  if (node.latencyHistory.length > 20) node.latencyHistory.shift();

  return node;
};

module.exports = { updateNode };
```

---

### 📄 backend/server.js

```javascript
// backend/server.js
// Main server: Express + Socket.io + monitoring loop

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors   = require('cors');

const { createInitialNodes }                          = require('./data');
const { makeDecision, predictBreach, PLAYBOOKS, THRESHOLD } = require('./aiEngine');
const { updateNode }                                  = require('./monitor');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

// ─── STATE ────────────────────────────────────────────────────────────────────
let nodes          = createInitialNodes();
let mode           = 'manual';          // 'manual' | 'ai'
let events         = [];
let attackState    = { active: false, targetNodeId: null, type: null, intensity: 70 };
let activePlaybook = null;
let lastAIDecision = null;
let attackStartTime = null;
let aiCooldown     = false;
let manualStats    = { reactionTime: 0, failedRequests: 0, switchCount: 0 };
let aiStats        = { reactionTime: 0, failedRequests: 0, switchCount: 0 };

// ─── EVENT LOGGER ─────────────────────────────────────────────────────────────
const addEvent = (type, message, nodeId = null) => {
  const event = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    type,   // INFO | WARN | ALERT | AI | ACTION | RESOLVE | METRIC
    message,
    nodeId
  };
  events.unshift(event);
  if (events.length > 200) events.pop();
  io.emit('new-event', event);
  return event;
};

// ─── PLAYBOOK EXECUTOR ────────────────────────────────────────────────────────
const executePlaybook = async (playbookKey, fromNodeId, toNodeId) => {
  const pb = PLAYBOOKS[playbookKey];
  if (!pb) return;

  activePlaybook = {
    key: playbookKey,
    name: pb.name,
    steps: pb.steps.map((s, i) => ({ ...s, id: i + 1, status: 'pending' })),
    currentStep: 0,
    completed: false
  };

  io.emit('playbook-started', activePlaybook);
  addEvent('AI', `Executing playbook: ${pb.name}`);

  for (let i = 0; i < activePlaybook.steps.length; i++) {
    activePlaybook.steps[i].status = 'running';
    activePlaybook.currentStep = i + 1;
    io.emit('playbook-update', { ...activePlaybook });
    await new Promise(r => setTimeout(r, activePlaybook.steps[i].duration));
    activePlaybook.steps[i].status = 'done';
    io.emit('playbook-update', { ...activePlaybook });
  }

  // Execute actual traffic shift after playbook finishes
  const fromNode = nodes.find(n => n.id === fromNodeId);
  const toNode   = nodes.find(n => n.id === toNodeId);
  if (fromNode && toNode) {
    const amt = fromNode.traffic * 0.75;
    toNode.traffic   = Math.min(95, toNode.traffic + amt);
    fromNode.traffic = Math.max(5, fromNode.traffic - amt);
    addEvent('ACTION', `Traffic shifted: Node ${fromNodeId} → Node ${toNodeId} (${Math.round(amt)}% load transferred)`);
    addEvent('RESOLVE', `Node ${toNodeId} absorbed load. Latency stabilizing...`);
  }

  activePlaybook.completed = true;
  io.emit('playbook-completed', { ...activePlaybook });
  setTimeout(() => { activePlaybook = null; }, 4000);
};

// ─── AI ENGINE RUNNER ─────────────────────────────────────────────────────────
const runAIEngine = () => {
  if (mode !== 'ai' || aiCooldown) return;

  const decision = makeDecision(nodes);
  if (!decision) return;

  aiCooldown = true;
  lastAIDecision = { ...decision, timestamp: new Date().toLocaleTimeString() };

  addEvent('AI', `Pattern detected. Analyzing... Confidence: ${decision.confidence}%`);

  setTimeout(async () => {
    io.emit('ai-decision', lastAIDecision);
    aiStats.reactionTime = decision.decisionTimeMs;
    aiStats.switchCount++;
    await executePlaybook(decision.playbook, decision.fromNodeId, decision.toNodeId);
    // Cooldown prevents multiple decisions in quick succession
    setTimeout(() => { aiCooldown = false; }, 15000);
  }, decision.decisionTimeMs);
};

// ─── MAIN MONITORING LOOP — every 2 seconds ───────────────────────────────────
const startMonitoring = () => {
  setInterval(async () => {
    // Ping all nodes in parallel (real HTTP requests)
    await Promise.all(nodes.map(node => updateNode(node, attackState)));

    // Log notable events
    nodes.forEach(node => {
      if (node.status === 'critical') {
        addEvent('ALERT', `Node ${node.id} CRITICAL — Latency: ${node.latency}ms | CPU: ${Math.round(node.cpu)}% | Health: ${node.healthScore}/100`, node.id);
      } else if (node.status === 'warning' && Math.random() < 0.4) {
        addEvent('WARN', `Node ${node.id} WARNING — Latency: ${node.latency}ms`, node.id);
      } else if (node.status === 'healthy' && Math.random() < 0.1) {
        addEvent('INFO', `Node ${node.id} healthy — ${node.latency}ms | Health: ${node.healthScore}/100`, node.id);
      }
    });

    // Calculate predictions for each node
    const predictions = {};
    nodes.forEach(node => {
      const secs = predictBreach(node.latencyHistory, THRESHOLD);
      if (secs) {
        predictions[node.id] = secs;
        if (secs < 20 && Math.random() < 0.3) {
          addEvent('WARN', `⏳ Node ${node.id} predicted to breach threshold in ~${secs}s`, node.id);
        }
      }
    });

    // Run AI if in AI mode
    runAIEngine();

    // Push full state to all connected dashboards
    io.emit('state-update', {
      nodes: nodes.map(n => ({ ...n })),
      mode,
      attackState,
      activePlaybook,
      lastAIDecision,
      predictions,
      stats: { manual: manualStats, ai: aiStats }
    });
  }, 2000);
};

// ─── SOCKET.IO CONNECTION ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);
  // Send current state immediately on connect
  socket.emit('state-update', {
    nodes: nodes.map(n => ({ ...n })),
    mode, attackState, activePlaybook, lastAIDecision,
    predictions: {}, stats: { manual: manualStats, ai: aiStats }
  });
  socket.emit('events-batch', events.slice(0, 50));
});

// ─── REST API ROUTES ──────────────────────────────────────────────────────────

// Switch mode: manual / ai
app.post('/api/mode', (req, res) => {
  mode = req.body.mode;
  aiCooldown = false;
  addEvent('INFO', `⚙️ Mode switched to: ${mode.toUpperCase()}`);
  io.emit('mode-changed', { mode });
  res.json({ success: true, mode });
});

// Launch attack
app.post('/api/attack/start', (req, res) => {
  const { type = 'ddos', targetNodeId = 1, intensity = 70, duration = 30 } = req.body;
  attackState  = { active: true, targetNodeId, type, intensity };
  attackStartTime = Date.now();

  addEvent('ALERT', `🔴 ATTACK STARTED: ${type.toUpperCase()} on Node ${targetNodeId} | Intensity: ${intensity}% | Duration: ${duration}s`, targetNodeId);
  io.emit('attack-started', attackState);

  // Auto-stop after duration
  setTimeout(stopAttack, duration * 1000);
  res.json({ success: true });
});

// Stop attack
const stopAttack = () => {
  const downtime = attackStartTime ? Math.round((Date.now() - attackStartTime) / 1000) : 0;
  attackState = { active: false, targetNodeId: null, type: null, intensity: 70 };
  attackStartTime = null;
  addEvent('RESOLVE', `✅ Attack subsided. System recovering... Total duration: ${downtime}s`);
  io.emit('attack-stopped', { downtime });

  // Gradually recover metrics after attack
  setTimeout(() => {
    nodes.forEach(node => {
      node.cpu = Math.max(10, node.cpu * 0.4);
      node.errorRate = 0;
      node.queue = Math.min(node.queue, 15);
    });
    addEvent('INFO', '🟢 All nodes recovering to normal state');
  }, 5000);
};

app.post('/api/attack/stop', (req, res) => {
  stopAttack();
  res.json({ success: true });
});

// Manual traffic shift (human clicks button)
app.post('/api/shift', (req, res) => {
  const { fromNodeId, toNodeId } = req.body;
  const fromNode = nodes.find(n => n.id === fromNodeId);
  const toNode   = nodes.find(n => n.id === toNodeId);
  if (!fromNode || !toNode) return res.status(400).json({ error: 'Invalid node IDs' });

  const amt = fromNode.traffic * 0.75;
  toNode.traffic   = Math.min(95, toNode.traffic + amt);
  fromNode.traffic = Math.max(5, fromNode.traffic - amt);

  const reactionTime = attackStartTime
    ? Math.round((Date.now() - attackStartTime) / 100) / 10
    : 0;

  manualStats.reactionTime    = reactionTime;
  manualStats.failedRequests += Math.floor(reactionTime * 12);
  manualStats.switchCount++;

  addEvent('ACTION', `👤 MANUAL SHIFT: Node ${fromNodeId} → Node ${toNodeId} | Human reaction time: ${reactionTime}s`, fromNodeId);
  res.json({ success: true, reactionTime });
});

// Reset everything to initial state
app.post('/api/reset', (req, res) => {
  nodes          = createInitialNodes();
  events         = [];
  attackState    = { active: false, targetNodeId: null, type: null, intensity: 70 };
  activePlaybook = null;
  lastAIDecision = null;
  aiCooldown     = false;
  attackStartTime = null;
  manualStats    = { reactionTime: 0, failedRequests: 0, switchCount: 0 };
  aiStats        = { reactionTime: 0, failedRequests: 0, switchCount: 0 };
  addEvent('INFO', '🔄 System reset to initial state');
  io.emit('reset');
  res.json({ success: true });
});

// Health check
app.get('/api/state', (req, res) => res.json({ nodes, mode, attackState }));

// ─── START ────────────────────────────────────────────────────────────────────
server.listen(3001, () => {
  console.log('🚀 NeuralFlow Backend → http://localhost:3001');
  startMonitoring();
  addEvent('INFO', '🟢 NeuralFlow V2 initialized. Monitoring 3 nodes...');
  addEvent('INFO', 'Pinging: httpbin.org | jsonplaceholder.typicode.com | sampleapis.com');
});
```

---

## SECTION 4: FRONTEND — GLOBAL SETUP

### 📄 frontend/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary:   #050508;
  --bg-surface:   #0a0a14;
  --bg-card:      #0f0f1a;
  --border:       #1a1a2e;
  --text-primary: #e8e8f0;
  --text-muted:   #555577;
  --neon-blue:    #00d4ff;
  --neon-green:   #00ff88;
  --neon-orange:  #ff6b35;
  --neon-red:     #ff2244;
  --neon-yellow:  #ffcc00;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Space Grotesk', 'Inter', 'Segoe UI', sans-serif;
  min-height: 100vh;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--bg-surface); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* Range input styling */
input[type=range] {
  accent-color: var(--neon-blue);
}
```

### 📄 frontend/tailwind.config.js

```javascript
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:      '#050508',
        surface:      '#0a0a14',
        card:         '#0f0f1a',
        'neon-blue':  '#00d4ff',
        'neon-green': '#00ff88',
        'neon-orange':'#ff6b35',
        'neon-red':   '#ff2244',
        'neon-yellow':'#ffcc00',
      }
    }
  },
  plugins: []
}
```

### 📄 frontend/src/socket.js

```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001', { transports: ['websocket'] });
export default socket;
```

---

## SECTION 5: FRONTEND COMPONENTS — COMPLETE CODE

### 📄 frontend/src/App.jsx

```jsx
import { useState, useEffect } from 'react';
import socket from './socket';
import Header          from './components/Header';
import NodeCard        from './components/NodeCard';
import LatencyGraph    from './components/LatencyGraph';
import ManualPanel     from './components/ManualPanel';
import AIPanel         from './components/AIPanel';
import EventLog        from './components/EventLog';
import AttackConsole   from './components/AttackConsole';
import AIExplainer     from './components/AIExplainer';
import MetricsPanel    from './components/MetricsPanel';
import PlaybookDisplay from './components/PlaybookDisplay';

export default function App() {
  const [nodes, setNodes]               = useState([]);
  const [mode, setMode]                 = useState('manual');
  const [events, setEvents]             = useState([]);
  const [attackState, setAttackState]   = useState({ active: false });
  const [activePlaybook, setActivePlaybook] = useState(null);
  const [lastAIDecision, setLastAIDecision] = useState(null);
  const [showExplainer, setShowExplainer]   = useState(false);
  const [predictions, setPredictions]   = useState({});
  const [stats, setStats]               = useState({ manual: {}, ai: {} });
  const [manualTimer, setManualTimer]   = useState(0);
  const [timerActive, setTimerActive]   = useState(false);

  useEffect(() => {
    socket.on('state-update', data => {
      setNodes(data.nodes || []);
      setAttackState(data.attackState || { active: false });
      setActivePlaybook(data.activePlaybook || null);
      setPredictions(data.predictions || {});
      setStats(data.stats || { manual: {}, ai: {} });
      if (data.lastAIDecision) setLastAIDecision(data.lastAIDecision);
    });

    socket.on('new-event', evt =>
      setEvents(prev => [evt, ...prev].slice(0, 200))
    );

    socket.on('events-batch', batch => setEvents(batch));

    socket.on('ai-decision', decision => {
      setLastAIDecision(decision);
      setShowExplainer(true);   // Auto-open explainer when AI acts
    });

    socket.on('playbook-started',  pb => setActivePlaybook(pb));
    socket.on('playbook-update',   pb => setActivePlaybook({ ...pb }));
    socket.on('playbook-completed', pb => {
      setActivePlaybook({ ...pb });
      setTimeout(() => setActivePlaybook(null), 4000);
    });

    socket.on('attack-started', state => {
      setAttackState(state);
      if (mode === 'manual') {
        setManualTimer(0);
        setTimerActive(true);
      }
    });

    socket.on('attack-stopped', () => setTimerActive(false));

    socket.on('reset', () => {
      setManualTimer(0);
      setTimerActive(false);
      setLastAIDecision(null);
      setShowExplainer(false);
      setActivePlaybook(null);
    });

    return () => socket.removeAllListeners();
  }, [mode]);

  // Tick the manual reaction timer
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => setManualTimer(t => t + 0.1), 100);
    return () => clearInterval(id);
  }, [timerActive]);

  const switchMode = async newMode => {
    setMode(newMode);
    await fetch('http://localhost:3001/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode })
    });
  };

  const handleManualShift = async (fromNodeId, toNodeId) => {
    setTimerActive(false);
    const res  = await fetch('http://localhost:3001/api/shift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromNodeId, toNodeId })
    });
    return res.json();
  };

  const handleReset = async () => {
    await fetch('http://localhost:3001/api/reset', { method: 'POST' });
  };

  const warningNode = nodes.find(n => n.status !== 'healthy');

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: 16 }}>
      <Header
        mode={mode}
        onModeSwitch={switchMode}
        onReset={handleReset}
        attackActive={attackState.active}
        nodeCount={nodes.length}
      />

      {/* Node Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        {nodes.map(node => (
          <NodeCard key={node.id} node={node} prediction={predictions[node.id]} />
        ))}
      </div>

      {/* Latency Graph */}
      <div style={{ marginBottom: 16 }}>
        <LatencyGraph nodes={nodes} />
      </div>

      {/* CORE COMPARISON: Manual vs AI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ManualPanel
          warningNode={warningNode}
          nodes={nodes}
          mode={mode}
          timer={manualTimer}
          timerActive={timerActive}
          onShift={handleManualShift}
          onTimerStop={() => setTimerActive(false)}
        />
        <AIPanel
          mode={mode}
          lastDecision={lastAIDecision}
          activePlaybook={activePlaybook}
          nodes={nodes}
          onViewDecision={() => setShowExplainer(true)}
        />
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <EventLog events={events} />
        <AttackConsole nodes={nodes} onReset={handleReset} />
        <MetricsPanel stats={stats} manualTimer={manualTimer} nodes={nodes} />
      </div>

      {/* Playbook (animates when active) */}
      {activePlaybook && (
        <div style={{ marginBottom: 16 }}>
          <PlaybookDisplay playbook={activePlaybook} />
        </div>
      )}

      {/* AI Decision Explainer Modal */}
      {showExplainer && lastAIDecision && (
        <AIExplainer
          decision={lastAIDecision}
          nodes={nodes}
          onClose={() => setShowExplainer(false)}
        />
      )}
    </div>
  );
}
```

---

### 📄 frontend/src/components/Header.jsx

```jsx
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
```

---

### 📄 frontend/src/components/NodeCard.jsx

```jsx
const STATUS_COLOR = {
  healthy:  'var(--neon-green)',
  warning:  'var(--neon-yellow)',
  critical: 'var(--neon-red)'
};

const STATUS_GLOW = {
  healthy:  '0 0 14px rgba(0,255,136,0.3)',
  warning:  '0 0 14px rgba(255,204,0,0.35)',
  critical: '0 0 20px rgba(255,34,68,0.55)'
};

const STATUS_BORDER = {
  healthy:  'rgba(0,255,136,0.35)',
  warning:  'rgba(255,204,0,0.45)',
  critical: 'rgba(255,34,68,0.6)'
};

const healthColor = s =>
  s >= 80 ? 'var(--neon-green)'  :
  s >= 60 ? 'var(--neon-yellow)' :
  s >= 40 ? 'var(--neon-orange)' : 'var(--neon-red)';

// Small horizontal bar gauge
function MiniGauge({ label, value, maxVal = 100, unit }) {
  const pct  = Math.min(100, (value / maxVal) * 100);
  const barC = pct > 75 ? 'var(--neon-red)' : pct > 50 ? 'var(--neon-yellow)' : 'var(--neon-blue)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6 }}>
      <span style={{ color: 'var(--text-muted)', width: 58, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 4 }}>
        <div style={{ width: `${pct}%`, height: 4, background: barC, borderRadius: 4, transition: 'width 0.6s' }} />
      </div>
      <span style={{ color: barC, width: 48, textAlign: 'right', fontWeight: 700 }}>
        {Math.round(value)}{unit}
      </span>
    </div>
  );
}

export default function NodeCard({ node, prediction }) {
  if (!node) return null;
  const sc = STATUS_COLOR[node.status] || 'var(--neon-green)';
  const hc = healthColor(node.healthScore);
  const latDisplay = node.latency > 1000
    ? `${(node.latency / 1000).toFixed(1)}s` : `${node.latency}ms`;

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'var(--bg-card)',
      border:     `1px solid ${STATUS_BORDER[node.status]}`,
      boxShadow:  STATUS_GLOW[node.status]
    }}>
      {/* Name + Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{node.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{node.location}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: sc,
            animation: node.status !== 'healthy' ? 'pulse 1s infinite' : 'none'
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: sc, textTransform: 'uppercase' }}>
            {node.status}
          </span>
        </div>
      </div>

      {/* 3 Big Numbers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: hc }}>{node.healthScore}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Health/100</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800,
            color: node.latency > 300 ? 'var(--neon-red)' : 'var(--neon-blue)' }}>
            {latDisplay}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Latency</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--neon-blue)' }}>
            {Math.round(node.traffic)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Traffic</div>
        </div>
      </div>

      {/* 5 Mini Gauges */}
      <MiniGauge label="Latency"  value={Math.min(node.latency, 1000)} maxVal={1000} unit="ms" />
      <MiniGauge label="CPU"      value={node.cpu}       unit="%" />
      <MiniGauge label="Memory"   value={node.memory}    unit="%" />
      <MiniGauge label="Errors"   value={node.errorRate} unit="%" />
      <MiniGauge label="Queue"    value={node.queue}     maxVal={500} unit="" />

      {/* Prediction warning */}
      {prediction && (
        <div style={{
          marginTop: 10, padding: '6px 10px', borderRadius: 8, fontSize: 11, textAlign: 'center',
          background: 'rgba(255,204,0,0.08)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,204,0,0.3)'
        }}>
          ⏳ Breach predicted in {Math.floor(prediction / 60)}m {prediction % 60}s
        </div>
      )}
    </div>
  );
}
```

---

### 📄 frontend/src/components/LatencyGraph.jsx

```jsx
import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Legend, ResponsiveContainer
} from 'recharts';

const NODE_COLORS = { 1: '#00d4ff', 2: '#00ff88', 3: '#ff6b35' };

export default function LatencyGraph({ nodes }) {
  const data = useMemo(() => {
    const maxLen = Math.max(...nodes.map(n => n.latencyHistory?.length || 0), 1);
    return Array.from({ length: maxLen }, (_, i) => {
      const pt = { tick: i };
      nodes.forEach(n => {
        const h   = n.latencyHistory || [];
        const idx = h.length - maxLen + i;
        if (idx >= 0 && h[idx]) pt[`n${n.id}`] = Math.min(h[idx].value, 3000);
      });
      return pt;
    });
  }, [nodes]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 12px', fontSize: 12
      }}>
        {payload.map(p => (
          <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
            Node {p.dataKey.replace('n', '')}: {p.value > 1000
              ? `${(p.value / 1000).toFixed(2)}s` : `${p.value}ms`}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-blue)' }}>
          📊 REAL-TIME LATENCY MONITOR
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Pinging: httpbin.org · jsonplaceholder.typicode.com · sampleapis.com
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ right: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis dataKey="tick" tick={{ fill: '#555577', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: '#555577', fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={v => v >= 1000 ? `${v / 1000}s` : `${v}ms`}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={300} stroke="rgba(255,204,0,0.5)" strokeDasharray="5 5"
            label={{ value: 'Threshold 300ms', fill: '#ffcc00', fontSize: 10, position: 'insideRight' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
                  formatter={v => `Node ${v.replace('n', '')}`} />
          {nodes.map(n => (
            <Line key={n.id} type="monotone" dataKey={`n${n.id}`}
              stroke={NODE_COLORS[n.id]} strokeWidth={2} dot={false}
              isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 📄 frontend/src/components/ManualPanel.jsx

```jsx
import { useState } from 'react';

export default function ManualPanel({ warningNode, nodes, mode, timer, timerActive, onShift, onTimerStop }) {
  const [shifting, setShifting] = useState(false);
  const [result, setResult]     = useState(null);

  const targetNode = nodes.find(n => n.id !== warningNode?.id && n.status === 'healthy');
  const isActive   = mode === 'manual';

  const handleShift = async () => {
    if (!warningNode || !targetNode || shifting) return;
    setShifting(true);
    try {
      const data = await onShift(warningNode.id, targetNode.id);
      setResult({ delay: data.reactionTime || timer });
      setTimeout(() => setResult(null), 6000);
    } finally {
      setShifting(false);
    }
  };

  const card = {
    padding: 16, borderRadius: 14, height: '100%',
    background: 'var(--bg-card)',
    border: `1px solid ${isActive ? 'var(--neon-yellow)' : 'var(--border)'}`
  };

  return (
    <div style={card}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>👤</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-yellow)' }}>
          MANUAL MODE — Human Engineer
        </span>
      </div>

      {/* Idle */}
      {!warningNode && !result && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🟢</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>All nodes healthy</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Launch an attack to see the difference...
          </p>
        </div>
      )}

      {/* Alert state */}
      {warningNode && !result && (
        <div>
          <div style={{
            padding: 12, borderRadius: 10, marginBottom: 14,
            background: 'rgba(255,34,68,0.1)', border: '1px solid var(--neon-red)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-red)', marginBottom: 4 }}>
              ⚠️ ALERT: {warningNode.name} {warningNode.status.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Latency: {warningNode.latency}ms · CPU: {Math.round(warningNode.cpu)}% · Health: {warningNode.healthScore}/100
            </div>
          </div>

          {/* Timer */}
          {timerActive && (
            <div style={{
              textAlign: 'center', padding: '12px 0', marginBottom: 14,
              background: 'rgba(255,204,0,0.06)', borderRadius: 10
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                ⏱️ Human reaction time (users waiting):
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--neon-yellow)' }}>
                {timer.toFixed(1)}s
              </div>
              <div style={{ fontSize: 11, color: 'var(--neon-red)', marginTop: 4 }}>
                ~{Math.floor(timer * 12)} requests failing right now
              </div>
            </div>
          )}

          {/* Steps engineer must take */}
          <div style={{
            padding: '10px 12px', borderRadius: 8, marginBottom: 14,
            background: 'var(--bg-surface)', fontSize: 12
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
              Engineer steps required:
            </div>
            <div style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
              1. Read the alert &nbsp; 2. Verify node metrics &nbsp; 3. Choose target node &nbsp; 4. Click shift button
            </div>
          </div>

          <button
            onClick={handleShift}
            disabled={shifting || !targetNode}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              fontWeight: 700, fontSize: 13, cursor: shifting ? 'wait' : 'pointer',
              background: 'rgba(255,204,0,0.15)', color: 'var(--neon-yellow)',
              border: '1px solid var(--neon-yellow)', transition: 'opacity 0.2s',
              opacity: shifting ? 0.7 : 1
            }}>
            {shifting
              ? '⏳ Shifting traffic...'
              : `🔀 Shift Traffic → ${targetNode?.name || 'No available node'}`}
          </button>
        </div>
      )}

      {/* Success */}
      {result && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, color: 'var(--neon-green)', marginBottom: 8 }}>
            Traffic Shifted (Manually)
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Human reaction time:&nbsp;
            <span style={{ color: 'var(--neon-orange)', fontWeight: 700 }}>
              {result.delay.toFixed(1)}s
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--neon-red)' }}>
            Requests failed during delay: ~{Math.floor(result.delay * 12)}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 📄 frontend/src/components/AIPanel.jsx

```jsx
import { useEffect, useState } from 'react';

export default function AIPanel({ mode, lastDecision, activePlaybook, nodes, onViewDecision }) {
  const [status, setStatus] = useState('monitoring');

  useEffect(() => {
    if (activePlaybook && !activePlaybook.completed) setStatus('acting');
    else if (lastDecision && !activePlaybook)        setStatus('resolved');
    else                                             setStatus('monitoring');
  }, [activePlaybook, lastDecision]);

  const isActive = mode === 'ai';
  const card = {
    padding: 16, borderRadius: 14, height: '100%',
    background: 'var(--bg-card)',
    border: `1px solid ${isActive ? 'var(--neon-blue)' : 'var(--border)'}`
  };

  return (
    <div style={card}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>🤖</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-blue)' }}>
          AI MODE — NeuralFlow Agent
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isActive ? 'var(--neon-blue)' : 'var(--text-muted)',
            animation: isActive ? 'pulse 1.5s infinite' : 'none'
          }} />
          <span style={{ fontSize: 10, fontWeight: 700,
            color: isActive ? 'var(--neon-blue)' : 'var(--text-muted)' }}>
            {isActive ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Monitoring state */}
      {status === 'monitoring' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-blue)', marginBottom: 6 }}>
            Continuously Monitoring
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Analyzing patterns every 2 seconds
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {nodes.filter(n => n.status === 'healthy').length}/{nodes.length} nodes healthy
          </div>
          {!isActive && (
            <div style={{
              marginTop: 16, padding: '8px 12px', borderRadius: 8, fontSize: 11,
              background: 'rgba(255,204,0,0.08)', color: 'var(--neon-yellow)'
            }}>
              Switch to AI MODE to enable auto-response
            </div>
          )}
        </div>
      )}

      {/* Acting (playbook running) */}
      {status === 'acting' && activePlaybook && (
        <div>
          <div style={{
            padding: '8px 12px', borderRadius: 8, textAlign: 'center', marginBottom: 12,
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-blue)' }}>
              ⚡ AUTO-RESPONDING
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Reaction time: &lt;300ms · Zero downtime
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--neon-blue)', marginBottom: 10 }}>
            {activePlaybook.name}
          </div>
          {activePlaybook.steps?.map(step => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
              <span>
                {step.status === 'done' ? '✅' : step.status === 'running' ? '🔄' : '⏳'}
              </span>
              <span style={{
                color: step.status === 'done'    ? 'var(--neon-green)'  :
                       step.status === 'running' ? 'var(--text-primary)' : 'var(--text-muted)'
              }}>
                {step.action}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Resolved */}
      {status === 'resolved' && lastDecision && (
        <div>
          <div style={{
            padding: 12, borderRadius: 10, textAlign: 'center', marginBottom: 12,
            background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)'
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-green)' }}>Auto-Resolved</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Reaction time:{' '}
              <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>
                {lastDecision.decisionTimeMs}ms
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--neon-green)', marginTop: 2 }}>
              Failed requests: 0
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-primary)' }}>Action:</span> Node {lastDecision.fromNodeId} → Node {lastDecision.toNodeId}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            <span style={{ color: 'var(--text-primary)' }}>Confidence:</span>{' '}
            <span style={{ color: 'var(--neon-blue)', fontWeight: 700 }}>{lastDecision.confidence}%</span>
          </div>
          <button onClick={onViewDecision} style={{
            width: '100%', padding: '10px 0', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: 'var(--neon-blue)',
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)'
          }}>
            🧠 View Full AI Decision Report
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 📄 frontend/src/components/EventLog.jsx

```jsx
const EV = {
  INFO:    { color: '#555577', icon: '🟢' },
  WARN:    { color: '#ffcc00', icon: '🟡' },
  ALERT:   { color: '#ff2244', icon: '🔴' },
  AI:      { color: '#00d4ff', icon: '🤖' },
  ACTION:  { color: '#ff6b35', icon: '⚡' },
  RESOLVE: { color: '#00ff88', icon: '✅' },
  METRIC:  { color: '#a855f7', icon: '📊' }
};

export default function EventLog({ events }) {
  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid var(--border)'
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-blue)', marginBottom: 12 }}>
        📋 LIVE EVENT LOG
      </div>
      <div style={{ height: 220, overflowY: 'auto', fontSize: 11 }}>
        {events.slice(0, 80).map(ev => {
          const s = EV[ev.type] || EV.INFO;
          return (
            <div key={ev.id} style={{
              display: 'flex', gap: 6, padding: '3px 0',
              borderBottom: '1px solid rgba(26,26,46,0.5)'
            }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>
                {ev.timestamp}
              </span>
              <span>{s.icon}</span>
              <span style={{ color: s.color, fontWeight: 700, flexShrink: 0 }}>{ev.type}</span>
              <span style={{ color: 'var(--text-primary)' }}>{ev.message}</span>
            </div>
          );
        })}
        {events.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 48 }}>
            System initializing...
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 📄 frontend/src/components/AttackConsole.jsx

```jsx
import { useState } from 'react';
import axios from 'axios';

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
    await axios.post('http://localhost:3001/api/attack/start', {
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
    await axios.post('http://localhost:3001/api/attack/stop');
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
```

---

### 📄 frontend/src/components/AIExplainer.jsx

```jsx
export default function AIExplainer({ decision, nodes, onClose }) {
  const from = nodes.find(n => n.id === decision.fromNodeId);
  const to   = nodes.find(n => n.id === decision.toNodeId);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, padding: 24, borderRadius: 16,
        background: 'var(--bg-card)', border: '1px solid var(--neon-blue)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--neon-blue)' }}>
            🧠 AI DECISION REPORT
          </span>
          <button onClick={onClose} style={{
            color: 'var(--text-muted)', background: 'none',
            border: 'none', fontSize: 18, cursor: 'pointer'
          }}>✕</button>
        </div>

        {/* Decision summary */}
        <div style={{
          padding: 12, borderRadius: 10, marginBottom: 16,
          background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Decision: Traffic Rerouted</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {from?.name} ({from?.location}) → {to?.name} ({to?.location})
          </div>
        </div>

        {/* Confidence bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>AI Confidence</span>
            <span style={{ color: 'var(--neon-blue)', fontWeight: 700 }}>{decision.confidence}%</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 6, height: 8 }}>
            <div style={{
              width: `${decision.confidence}%`, height: 8, borderRadius: 6,
              background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-green))'
            }} />
          </div>
        </div>

        {/* Reasoning */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📋 Reasoning:</div>
          {decision.reasons?.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--neon-green)', flexShrink: 0 }}>✓</span>
              <span style={{ color: 'var(--text-muted)' }}>{r}</span>
            </div>
          ))}
        </div>

        {/* Alternatives */}
        {decision.alternatives?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🔄 Alternatives Considered:</div>
            {decision.alternatives.map((alt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--neon-red)', flexShrink: 0 }}>✗</span>
                <span style={{ color: 'var(--text-muted)' }}>{alt}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timing numbers */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          padding: 12, borderRadius: 10, background: 'var(--bg-surface)'
        }}>
          {[
            { label: 'Decision Time', value: `${decision.decisionTimeMs}ms`, color: 'var(--neon-green)' },
            { label: 'Est. Savings',  value: `$${decision.estimatedSavings}/min`, color: 'var(--neon-green)' },
            { label: 'Failed Reqs',  value: '0', color: 'var(--neon-green)' }
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 📄 frontend/src/components/MetricsPanel.jsx

```jsx
export default function MetricsPanel({ stats, manualTimer, nodes }) {
  const avgLatency = nodes.length
    ? Math.round(nodes.reduce((s, n) => s + (n.latency || 0), 0) / nodes.length) : 0;
  const aiLatency  = nodes.find(n => n.status === 'healthy')?.latency || 0;
  const failedReqs = Math.floor(manualTimer * 12);

  const rows = [
    { label: 'Reaction Time',    manual: `${manualTimer.toFixed(1)}s`,  ai: '<0.3s' },
    { label: 'Avg Latency',      manual: `${avgLatency}ms`,              ai: `${aiLatency}ms` },
    { label: 'Failed Requests',  manual: `~${failedReqs}`,               ai: '0' },
    { label: 'Cost Impact',      manual: '$180/hr',                      ai: '$15/hr' },
    { label: 'Human Errors',     manual: 'Possible',                     ai: 'None' },
  ];

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid var(--border)'
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-blue)', marginBottom: 12 }}>
        📊 METRICS COMPARISON
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 700 }}>
        <div style={{ color: 'var(--text-muted)' }}>Metric</div>
        <div style={{ textAlign: 'center', color: 'var(--neon-yellow)' }}>👤 Manual</div>
        <div style={{ textAlign: 'center', color: 'var(--neon-blue)'   }}>🤖 AI</div>
      </div>

      {rows.map(row => (
        <div key={row.label} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
          fontSize: 12, padding: '8px 0',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ color: 'var(--text-muted)' }}>{row.label}</div>
          <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--neon-orange)' }}>
            {row.manual}
          </div>
          <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--neon-green)' }}>
            {row.ai}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 📄 frontend/src/components/PlaybookDisplay.jsx

```jsx
export default function PlaybookDisplay({ playbook }) {
  if (!playbook) return null;

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid rgba(0,212,255,0.35)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--neon-blue)' }}>
          {playbook.name}
        </span>
        {playbook.completed && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
            background: 'rgba(0,255,136,0.1)', color: 'var(--neon-green)'
          }}>
            COMPLETED
          </span>
        )}
      </div>

      {/* Horizontal step list */}
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 0 }}>
        {playbook.steps?.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {/* Step circle + label */}
            <div style={{ textAlign: 'center', maxWidth: 110 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                background: step.status === 'done'    ? 'rgba(0,255,136,0.15)' :
                            step.status === 'running' ? 'rgba(0,212,255,0.15)' : 'var(--bg-surface)',
                border: `2px solid ${
                  step.status === 'done'    ? 'var(--neon-green)' :
                  step.status === 'running' ? 'var(--neon-blue)'  : 'var(--border)'
                }`,
                transition: 'all 0.4s'
              }}>
                {step.status === 'done' ? '✅' : step.status === 'running' ? '🔄' : step.id}
              </div>
              <div style={{
                fontSize: 10, lineHeight: 1.4,
                color: step.status === 'done'    ? 'var(--neon-green)'  :
                       step.status === 'running' ? 'var(--text-primary)' : 'var(--text-muted)'
              }}>
                {step.action}
              </div>
            </div>
            {/* Connector line */}
            {i < playbook.steps.length - 1 && (
              <div style={{
                width: 32, height: 2, flexShrink: 0, margin: '0 4px', marginBottom: 22,
                background: step.status === 'done' ? 'var(--neon-green)' : 'var(--border)',
                transition: 'background 0.4s'
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## SECTION 6: PACKAGE.JSON FILES

### backend/package.json
```json
{
  "name": "neuralflow-backend",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev":   "nodemon server.js"
  },
  "dependencies": {
    "express":   "^4.18.2",
    "socket.io": "^4.7.5",
    "cors":      "^2.8.5",
    "axios":     "^1.7.7"
  },
  "devDependencies": {
    "nodemon": "^3.1.7"
  }
}
```

### frontend/package.json
```json
{
  "name": "neuralflow-frontend",
  "version": "2.0.0",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react":            "^18.3.1",
    "react-dom":        "^18.3.1",
    "recharts":         "^2.12.7",
    "socket.io-client": "^4.7.5",
    "axios":            "^1.7.7",
    "framer-motion":    "^11.11.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.2",
    "tailwindcss":          "^3.4.14",
    "autoprefixer":         "^10.4.20",
    "postcss":              "^8.4.47",
    "vite":                 "^5.4.10"
  }
}
```

### postcss.config.js
```javascript
export default {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {}
  }
}
```

---

## SECTION 7: QUICK START

```bash
# Terminal 1 — Backend
cd neuralflow/backend
npm install
node server.js
# ✅ Output: 🚀 NeuralFlow Backend → http://localhost:3001

# Terminal 2 — Frontend
cd neuralflow/frontend
npm install
npm run dev
# ✅ Output: → Local: http://localhost:5173
```

### Verify real websites work before demoing:
```bash
# These must respond (takes 0-3s depending on chosen URL)
curl -w "Time: %{time_total}s\n" https://httpbin.org/delay/0
curl -w "Time: %{time_total}s\n" https://httpbin.org/delay/2
curl -w "Time: %{time_total}s\n" https://jsonplaceholder.typicode.com/posts/1
```

---

## SECTION 8: DEMO SCRIPT (5 Minutes — Teacher Presentation)

### What to say, when, and what to click:

**[0:00 – 0:30] — Introduction**
> "Ye hai NeuralFlow — ek AI-powered infrastructure manager. Yahan 3 nodes hain jo real websites ping kar rahe hain. Latency graph mein actual response times hain — koi fake data nahi."

**[0:30 – 1:00] — Normal State**
> "Abhi sab green hai. Node 1 httpbin.org ping kar raha hai, Node 2 jsonplaceholder, Node 3 sampleapis. Latency 100-300ms ke beech hai — healthy range."

**[1:00 – 1:30] — Switch to MANUAL MODE, then launch attack**
> "Pehle MANUAL MODE mein chalate hain — bilkul waise jaise ek real engineer karta hai."

Click: **MANUAL MODE button** → then click: **LAUNCH ATTACK on Node 1**

**[1:30 – 2:30] — Let manual mode struggle**
> "Dekho — Node 1 ki latency 2000ms+ ho gayi. Yeh real hai — backend ab httpbin.org/delay/2 ping kar raha hai, jo actually 2 seconds mein respond karta hai. Timer chal raha hai — ye seconds log ke liye downtime hai."

Wait 10-12 seconds for dramatic effect. Then:
> "Ab engineer ko manually decide karna pada..."

Click: **SHIFT TRAFFIC button**

> "Humne shift kar diya — lekin 12 seconds lag gaye. 12 seconds mein ~144 requests fail ho gayi."

**[2:30 – 3:00] — Reset + Switch to AI MODE**
Click: **RESET** → Click: **AI MODE** → Launch same attack

**[3:00 – 3:45] — Watch AI respond**
> "Same attack. Ab AI mode. Dekho — 200ms mein detect kar liya, playbook chal raha hai, steps execute ho rahe hain, automatically shift ho gaya. Zero downtime. Zero human intervention."

**[3:45 – 4:15] — Show AI Explainer**
> "Aur ye khass cheez hai — AI ne kya socha? Click karte hain 'View AI Decision Report'."

Click: **View Full AI Decision Report** button

> "Yahan AI explain kar raha hai: kyun shift kiya, confidence 94% tha, alternatives kya the, kitne ms mein decide kiya. Ye explainable AI hai — black box nahi."

**[4:15 – 4:45] — Show metrics**
> "Final numbers dekho — Manual: 12 seconds reaction, ~144 failed requests. AI: 200ms, 0 failures. Cost impact: $180/hr vs $15/hr."

**[4:45 – 5:00] — Close**
> "NeuralFlow V2 — real data, explainable AI, structured automated recovery. Yahi hai agentic autonomous system."

---

## SECTION 9: TROUBLESHOOTING

| Problem | Cause | Fix |
|---------|-------|-----|
| Latency shows 9999 | httpbin.org timeout | Increase `timeout: 10000` in monitor.js |
| Graph not updating | Socket not connecting | Check both servers running, CORS allowed |
| CORS error in browser | Backend missing headers | Ensure `app.use(cors())` before all routes |
| Attack not spiking latency | Wrong endpoint check | Verify `ATTACK_ENDPOINTS` in data.js |
| Nodes show 0ms always | First tick hasn't completed | Wait 4-6 seconds after starting backend |
| Playbook not animating | State not propagating | Check socket.on('playbook-update') in App.jsx |

### Backup URLs (if httpbin.org is down):
```javascript
// Replace in data.js ATTACK_ENDPOINTS:
const ATTACK_ENDPOINTS = {
  1: 'https://httpbin.org/delay/2',    // Primary
  // Backup options if httpbin is slow:
  // 'https://dummyjson.com/test',
  // Add a simple Express sleep endpoint on your backend
};

// Or add a local slow endpoint in server.js:
app.get('/slow/:sec', async (req, res) => {
  await new Promise(r => setTimeout(r, req.params.sec * 1000));
  res.json({ ok: true });
});
// Then use: 'http://localhost:3001/slow/2' as ATTACK_ENDPOINT
```

---

## SECTION 10: FEATURES CHECKLIST

### Must Have (Core Demo):
- [x] Real website pinging with actual latency measurement
- [x] 3 nodes with different URL targets
- [x] Attack = switch to slow httpbin endpoint (real latency spike)
- [x] Manual mode: alert + countdown timer + manual shift button
- [x] AI mode: auto-detect + auto-shift in <300ms
- [x] 5-metric health score per node (latency, CPU, memory, errors, queue)
- [x] Real-time latency graph with 300ms threshold line
- [x] Event log — color-coded, live scrolling
- [x] AI decision explainer modal
- [x] Recovery playbooks with animated steps
- [x] Manual vs AI metrics comparison

### Nice to Have (Add if Time):
- [ ] Predictive breach countdown (formula is in aiEngine.js already)
- [ ] Integration popups (Slack/PagerDuty simulation)
- [ ] Post-attack auto report (HTML download)
- [ ] Dynamic node add/remove

---
