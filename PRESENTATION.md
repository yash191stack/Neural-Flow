# NeuralFlow V3 — Final Presentation
## Autonomous AI Infrastructure Protection System

---

## 1. PROJECT KYA HAI? (What is this project?)

NeuralFlow V3 ek **autonomous AI-powered infrastructure protection system** hai jo real-time web services ko monitor karta hai, degradation detect karta hai, aur bina kisi human intervention ke traffic ko healthy nodes pe automatically reroute kar deta hai — **2.4 seconds** mein.

**Problem Statement:**
Aaj kal web services ka infrastructure complex ho gaya hai — microservices, multiple data centers, geo-distributed nodes. Jab ek node fail hota hai ya degrade hota hai:
- **Human reaction time**: 5-15 minutes (alert suno → dashboard kholo → samjho → decide karo → action lo)
- **Revenue loss**: Every minute of downtime = ₹15-50 lakhs (for e-commerce platforms)
- **Human errors**: Wrong node select karna, weight galat set karna, restart karne mein delay

NeuralFlow yeh sab khatam karta hai — **AI detect karta hai, predict karta hai, aur automatically reroute karta hai** — 2.4 seconds mein, zero human intervention.

---

## 2. KYUN JARURAT PADI? (Why was this needed?)

| Problem | Traditional Approach | NeuralFlow Solution |
|---------|---------------------|-------------------|
| Node degradation | Human monitors dashboard | AI detects in 5 seconds (latency ≥280ms OR health ≤0) |
| Failure prediction | Reactive (fix after crash) | Predictive — "Breach in X seconds" countdown |
| Traffic rerouting | Manual config change | Automatic weighted rerouting in 2.4s |
| Recovery verification | Hope it works | 3-consecutive-check verification before confirming |
| Multi-node management | Multiple dashboards | Single command center with 3D visualization |
| Cost of downtime | ₹15-50 lakhs/minute | Revenue protection model tracks savings |

**Real-world scenario:**
BharatBazaar (e-commerce platform) ke 3 data centers hain — Mumbai, Delhi, Bangalore. Agar Mumbai node pe DDoS attack hota hai:
- Without NeuralFlow: 5-15 min human reaction → lakhs ka revenue loss
- With NeuralFlow: 2.4s autonomous reroute → minimal revenue loss, zero downtime

---

## 3. UNIQUE SELLING PROPOSITION (USP)

### What makes NeuralFlow different from existing monitoring tools?

| Feature | Datadog/New Relic | Grafana/Prometheus | NeuralFlow V3 |
|---------|------------------|-------------------|---------------|
| Monitoring | ✅ | ✅ | ✅ |
| Alerting | ✅ | ✅ | ✅ |
| **Auto-rerouting** | ❌ | ❌ | ✅ (autonomous) |
| **Failure Prediction** | Basic | ❌ | ✅ (neural network + slope analysis) |
| **Incident State Machine** | ❌ | ❌ | ✅ (7-stage lifecycle) |
| **AI Explainability** | ❌ | ❌ | ✅ (WHY decisions were made) |
| **Revenue Impact Tracking** | ❌ | ❌ | ✅ ($0.15/request model) |
| **3D Real-time Visualization** | ❌ | ❌ | ✅ (Three.js + React Three Fiber) |
| **AI vs Human Comparison** | ❌ | ❌ | ✅ (response time, failures, savings) |
| **External App Integration** | Plugin-based | Plugin-based | ✅ (BharatBazaar real e-commerce) |

### Core USP: **"AI Detects, Predicts, and Reroutes — You Watch"**
- Zero-touch infrastructure protection
- Explainable AI (not a black box)
- Real-time 3D command center
- Revenue impact quantified in real-time

---

## 4. AI MODEL — KAUNSA USE KIYA?

### Neural Network Architecture: Brain.js Feedforward NN

```
Input Layer (9 features) → Hidden Layer 1 (12) → Hidden Layer 2 (8) → Hidden Layer 3 (6) → Output (3 classes)
```

**9 Input Features (normalized 0-1):**
1. Latency (response time / 1000)
2. Error Rate (errors / 100)
3. Queue Size (queue / 100)
4. CPU Usage (%)
5. Memory Usage (RSS MB)
6. Requests Per Second (/ 200)
7. Time of Day (hour / 24)
8. Latency Trend (slope of last 8 samples)
9. Error Trend (slope of error history)

**3 Output Classes:**
1. **Normal** — system healthy
2. **Warning** — early degradation detected
3. **Critical** — immediate action needed

**Training:** 500 synthetic samples (60% normal / 40% attack scenarios) × up to 2000 iterations, error threshold 0.005

**Classification:** CRITICAL if `critical > 0.6`, WARNING if `warning > 0.4 || critical > 0.3`, else NORMAL

### Detection Rules (Deterministic + Neural):

The AI uses a **hybrid approach**:
1. **Neural Network** provides probability scores (attack probability = critical output)
2. **Deterministic rules** drive actual rerouting decisions:
   - **Fast Path:** Latency ≥ 280ms OR Health ≤ 0 OR Status = CRITICAL
   - **Early Warning Path:** Latency > 100ms AND slope > 8ms/sample AND RPS > 15
3. **Candidate Scoring:** `score = health×0.5 + max(0, 300−latency)×0.3 + max(0, 100−rps)×0.2`
4. **Traffic Shift:** Fixed 40% weight moved from degraded to healthy node

### Explainability (SHAP-style):
- `getFeatureAttribution()` — one-feature-at-a-time deviation analysis
- Shows judges exactly WHY each decision was made (latency contributed X%, health Y%, etc.)

---

## 5. KAISE BANAYA? (How was it built? — 5 lines)

1. **Backend** Node.js + Express + WebSocket server pe run karta hai jo 3 simulated ya real nodes ko monitor karta hai, weighted router proxy ke through traffic distribute karta hai, aur har 100ms pe AI decision engine run karta hai
2. **AI Engine** brain.js neural network use karta hai jo 9 real-time features (latency, RPS, CPU, error rate, etc.) se training data se learn karta hai aur normal/warning/critical classify karta hai, while deterministic rules actual rerouting triggers karte hain
3. **Telemetry Layer** real HTTP servers pe sliding-window measurement (50 buckets × 100ms = 5s window) se actual latency, RPS, error rate, CPU aur memory track karta hai — simulated load ke through
4. **Frontend** React 18 + Three.js 3D visualization + Recharts + Zustand state management + WebSocket auto-reconnect se real-time dashboard banaya hai with 5 pages (Dashboard, Monitoring, Comparison, Reports, Settings)
5. **Integration** real e-commerce app BharatBazaar se connect hota hai external mode mein — actual production-like nodes (Mumbai/Delhi/Bangalore) ko monitor, detect, aur reroute karke dikhata hai

---

## 6. ARCHITECTURE

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                          │
│  localhost:5173 · Vite Dev Server                                  │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Dashboard │ │Monitoring│ │AI vs     │ │Reports   │ │Settings  │ │
│  │  Page    │ │  Page    │ │Human     │ │  Page    │ │  Page    │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       └─────────────┴────────────┴─────────────┴────────────┘      │
│                              │ Zustand Store                        │
│                              │ (useWebSocket.js)                    │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ WebSocket (ws://localhost:3001)
                               │ + REST API (http://localhost:3001)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NEURALFLOW BACKEND (Express + WS) :3001                │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ EventStore   │  │ NeuralAgent  │  │ Incident State Machine     │ │
│  │ (1000 events)│  │ (brain.js)   │  │ NORMAL→DETECTED→PREDICTED │ │
│  │              │  │ 9→12→8→6→3   │  │ →REROUTING→VERIFYING      │ │
│  │              │  │              │  │ →RESOLVED→COOLDOWN→NORMAL  │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Weighted Random Router (×2)                     │   │
│  │  :4000 (INTERNAL)          │    :5100 (EXTERNAL)            │   │
│  └──────────────┬─────────────┴───────────────┬────────────────┘   │
│                 │                              │                     │
│  ┌──────────────▼──────────────┐  ┌───────────▼──────────────────┐ │
│  │ LoadGenerator (burst mode)  │  │ ExternalNodeAdapter (monitor)│ │
│  │ 50ms tick, configurable    │  │ Polls /api/metrics every 1s  │ │
│  │ intensity (20-80 RPS)      │  │ Injects stress via /api/demo │ │
│  └────────────────────────────┘  └──────────────────────────────┘ │
└───────────┬───────────────────────────────────────┬────────────────┘
            │                                       │
            ▼                                       ▼
┌───────────────────────┐           ┌───────────────────────────────┐
│   INTERNAL NODES      │           │   EXTERNAL NODES (BharatBazaar)│
│   (Simulated HTTP)    │           │   (Real E-commerce App)        │
│                       │           │                                │
│  :4001 Testfire Bank  │           │  :5001 BB-NODE-1 (Mumbai)     │
│  :4002 Zero Bank      │           │  :5002 BB-NODE-2 (Delhi)      │
│  :4003 VulnWeb PHP    │           │  :5003 BB-NODE-3 (Bangalore)  │
│                       │           │                                │
│  Traffic Weights:     │           │  Traffic Weights:              │
│  N1: 60% N2: 25% N3:15%│          │  N1: 20% N2: 25% N3:55%      │
└───────────────────────┘           └───────────────────────────────┘
```

---

## 7. LANGUAGES & TECHNOLOGIES USED

### Languages
| Language | Usage |
|----------|-------|
| **JavaScript (ES6+)** | Backend + Frontend (100% JS stack) |
| **JSX** | React components |
| **Bash** | start.sh launcher (macOS/Linux) |
| **Batch** | START_PROJECT.bat (Windows) |

### Backend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | Runtime | Server, child processes, networking |
| **Express** | 4.18 | REST API server |
| **ws (WebSocket)** | 8.14 | Real-time bidirectional communication |
| **brain.js** | 2.0.0-beta.23 | Neural network (feedforward, 9→12→8→6→3) |
| **uuid** | 9.x | Unique event/incident IDs |
| **child_process (fork)** | Built-in | Isolated node simulation |

### Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | UI framework |
| **Vite** | 5.x | Build tool + dev server |
| **react-router-dom** | 6.20 | Client-side routing (5 pages) |
| **Zustand** | 4.4 | State management |
| **Three.js** | 0.168 | 3D visualization engine |
| **@react-three/fiber** | Latest | React renderer for Three.js |
| **@react-three/drei** | Latest | 3D helpers (OrbitControls, Stars, Html) |
| **@react-three/postprocessing** | Latest | Bloom, glow effects |
| **Recharts** | 2.8 | 2D charts (latency trends, stats) |
| **Framer Motion** | 10.x | Animations, transitions |
| **Lucide React** | Latest | Icons |
| **react-hot-toast** | Latest | Toast notifications |
| **gsap** | Latest | Advanced animations |
| **Tailwind CSS** | 3.3 | Utility-first styling |

### APIs Used
| API | Purpose |
|-----|---------|
| **Brain.js** (local, no external API) | Neural network training & inference |
| **BharatBazaar REST API** | External app monitoring (/api/metrics, /api/health, /api/demo/stress) |
| **No external AI APIs** (OpenAI, etc.) | Everything runs locally — no API keys needed |

---

## 8. DEMO WALKTHROUGH — JUDGES KO KYA DIKHAYENGE

### Page 1: COMMAND CENTER (Dashboard) — `/dashboard`

**Top Bar:**
- 🟢 NeuralFlow brand + version
- **Environment Switcher**: INTERNAL (Demo) ↔ BHARATBAZAAR (Real App)
  - Green checkmark when BharatBazaar nodes reachable
  - Click to switch — resets everything, reconnects to live app
- **Mode Toggle**: 🟣 PROTECTED (AI Mode) / 🔴 ACTION PENDING (Manual Mode)
- **Attack Controls**: Target Node selector + Intensity slider (20/40/60/80 RPS) + START/CONTAIN/RESET buttons

**Left Column:**
- **System Overview**: Total events, Active attacks, AI decisions count
- **LAST AI ACTION**: Shows from→to node, confidence %, response time

**Center:**
- **3D Network Topology** (Three.js):
  - 3 glowing spheres = 3 nodes (color by health: green=healthy, yellow=warning, red=critical)
  - OrbitControls — rotate, zoom, pan
  - Attack rings pulse around degraded node
  - Glow halos show node health visually

**Right Column:**
- **Live Event Log**: Scrolling feed with color-coded tags (INFO/ALERT/AI/ROUTE/RECOV/SPIKE)

**Node Cards (3×):**
- Each shows: LATENCY (ms), RPS, HEALTH (%), ERRORS (%)
- CPU bar + Memory bar
- Traffic weight % (e.g., "20% of total")
- **BREACH IN Xs** countdown when predicted

**AI Decision Summary Panel** (appears after AI reroute):
- **WHY THIS DECISION**: Reasons like "Latency exceeded threshold", "Health degraded below critical"
- **CANDIDATES EVALUATED**: Which nodes were considered, which rejected and why
- **NODE COMPARISON TABLE**: Before/After latency, health, RPS, error rates
- **TRAFFIC REROUTE VISUALIZATION**: Dual progress bars showing weight shift (60%→20%)
- **RESPONSE TIME COMPARISON**: AI: 1.0s vs Manual: X.Xs
- **ESTIMATED IMPACT**: Revenue saved ($X.XX illustrative)

**Human Intervention Panel** (Manual mode only):
- Live elapsed timer counting up
- Degraded node telemetry
- REROUTE + CONTAIN action buttons

**Bottom Row:**
- **Incident Timeline**: 7-stage lifecycle stepper (NORMAL → DETECTED → PREDICTED → REROUTING → VERIFYING → RESOLVED → COOLDOWN)
- **Latency Chart**: Rolling 30-point Recharts area chart, 3 colored lines per node
- **Predictive Risk Engine**: "Breach in 12s" countdown

---

### Page 2: LIVE MONITORING — `/monitoring`

**System Health Score**: Big number (avg of all node health scores)
- 🟢 Healthy: 3 nodes | 🟡 Warning: 0 | 🔴 Critical: 0

**Active Incident Banner** (when attack active):
- Attack type, target node, elapsed time, revenue loss

**Node Grid** (clickable cards):
- Each node shows: Status pill (HEALTHY/WARNING/CRITICAL), Health score, Latency, RPS, CPU%, Memory%, Error rate
- Click opens detail modal with full telemetry

**Load Generator Console**:
- Attack type selector (TrafficSpike)
- Target node dropdown
- Intensity slider
- START/STOP buttons
- Live stats: Requests sent, completed, failed

**Recent Events List**: Last 10 events with timestamps

---

### Page 3: AI vs HUMAN COMPARISON — `/comparison`

**The hackathon showpiece — directly compares AI speed vs human speed**

**Mode Toggle**: AI MODE / HUMAN MODE

**AI Session Results** (after AI reroute):
- ⚡ AI Response Time: **1.0 seconds**
- Traffic rerouted from Node 1 → Node 3
- Confidence: 100%
- Revenue Impact: $X.XX saved
- Before/After node weights

**Manual Session Results** (after human reroute):
- 🧑 Human Reaction Time: **X.X seconds** (typically 5-15s in demo)
- Failed Requests During Delay: X
- Revenue Loss: $X.XX
- Before/After node weights

**Side-by-Side Comparison** (both sessions completed):
- Response time bar chart comparison
- Failed requests comparison
- Revenue impact comparison
- Key insight: "AI was X.X times faster"

**Why this matters for judges:**
- Real data only — no fabricated metrics
- Shows actual time difference between AI autonomous reroute and human manual reroute
- Quantifies revenue impact

---

### Page 4: REPORTS & ANALYTICS — `/reports`

**Stat Cards**:
- Total Events | Critical Events | AI Decisions | Avg AI Response Time | Server Uptime

**Event Timeline**:
- Type filter pills (ALL/ALERT/AI/RECOVERY/INFO/SPIKE)
- Text search
- Color-coded vertical timeline
- Each event: timestamp, type badge, nodeId, message, severity

**Export Options**:
- **Download CSV** — spreadsheet-ready
- **Download JSON** — programmatic analysis

---

### Page 5: SETTINGS — `/settings`

**Configuration**:
- Theme: Dark / Light mode
- Toast notifications: ON/OFF
- Alert sound: ON/OFF
- Alert threshold: 100-1000ms slider
- Detection sensitivity: LOW → MEDIUM → HIGH → PARANOID
- Training samples: 100-1000 slider
- Auto-retrain: ON/OFF

**Model Management**:
- Model export (JSON download)
- Retrain button (calls `/api/model/retrain`)

**Integrations**:
- Webhook URL field + Test POST button
- Cloudflare API key field
- Slack notifications toggle

**Persistence**: All settings saved in localStorage

---

## 9. LIVE MONITORING — KYA DATA LE RAHA HAI?

### Per-Node Telemetry (polled every 1 second):

| Metric | How It's Calculated | Unit |
|--------|-------------------|------|
| **Latency** | Real HTTP response time measured via setTimeout (base + RPS-driven delay) | ms |
| **RPS** | Sliding window: 50 buckets × 100ms = 5s window, count requests | req/s |
| **Error Rate** | 503 responses / total requests in sliding window | % |
| **Health Score** | `clamp(latencyScore×0.5 + cpuScore×0.3 + errorScore×0.2)` | 0-100 |
| **CPU Usage** | `process.cpuUsage()` delta measured every second | % |
| **Memory** | RSS (Resident Set Size) from process | MB |
| **Traffic Weight** | Configured routing weight (% of total traffic) | % |
| **Latency Trend** | Slope of last 8 latency samples (linear regression) | ms/sample |
| **Predicted Breach** | `(300 - currentLatency) / slope` if slope > 5 ms/sample | seconds |

### Health Score Formula:
```
latencyScore = 100 - (latency - baseLatency) / 3    (0-100, lower=better)
cpuScore     = 100 - cpuUsage × 2.5                 (0-100, lower CPU=better)
errorScore   = 100 - errorRate × 5                   (0-100, fewer errors=better)

healthScore = clamp(latencyScore×0.5 + cpuScore×0.3 + errorRate×0.2)

Status: CRITICAL if < 40 | WARNING if < 70 | HEALTHY if ≥ 70
```

### Charts Visualized:
1. **Rolling Latency Chart** (Dashboard): 30-point Recharts area chart, 3 colored lines (one per node), updates every 1s
2. **CPU/Memory Bars** (Node Cards): Real-time progress bars
3. **3D Topology** (Three.js): Node spheres colored by health, glow intensity proportional to health
4. **Attack Rings** (Three.js): Expanding pulse rings on degraded node during attack
5. **Predictive Countdown** (Dashboard): "Breach in X seconds" real-time countdown
6. **Incident Timeline** (Dashboard): 7-stage stepper showing current incident lifecycle

---

## 10. INCIDENT LIFECYCLE — STEP BY STEP

```
NORMAL ──[latency ≥280ms]──► DETECTED ──[breach predicted]──► PREDICTED
                                                             │
                                          ┌── AI MODE ───────┤── MANUAL MODE ──┐
                                          ▼                   ▼                 │
                                      REROUTING          ACTION_PENDING        │
                                      (auto 40%          (human decides)      │
                                       weight shift)                          │
                                          │                   │                │
                                          ▼                   ▼                │
                                      VERIFYING ◄────────────┘                │
                                      (3 consecutive                          │
                                       recovery checks)                       │
                                          │                                   │
                                          ▼                                   │
                                      RESOLVED ──[10s]──► COOLDOWN ──► NORMAL │
```

**Timings (captured in live test):**
- t=0.0s: Attack starts (traffic spike on Node 1)
- t=5.0s: DETECTED (latency exceeded threshold)
- t=5.0s: PREDICTED (breach imminent)
- t=5.0s: REROUTING begins (800ms deliberation delay)
- t=5.8s: Traffic rerouted (Node 1 → Node 3)
- t=5.8s: VERIFYING (monitoring recovery)
- t=14.3s: COOLDOWN (incident resolved)
- t=24.4s: NORMAL (system fully recovered)

**Total AI Response Time: ~1.0 second** (detection to reroute completion)

---

## 11. TWO MODES — AI vs MANUAL

### AI Mode (Autonomous)
1. Attack detected → Neural network classifies severity
2. Deterministic rules confirm rerouting needed
3. Candidate scoring: `score = health×0.5 + max(0,300−lat)×0.3 + max(0,100−rps)×0.2`
4. Best candidate selected → 40% traffic weight shifted
5. Verification: 3 consecutive checks (latency <120ms AND health ≥70)
6. Resolution confirmed → 10s cooldown → back to NORMAL

### Manual Mode (Human-in-the-Loop)
1. Attack detected → System waits for human action
2. Timer counts up (elapsed time tracked)
3. Every 5s: Revenue loss calculated ($0.15 per failed request)
4. Human clicks REROUTE → Manual reroute executes
5. System records `completedSession` with reaction time
6. Comparison page shows AI vs Human side-by-side

---

## 12. BHARATBAZAAR INTEGRATION (Real App Demo)

### How it works:
1. BharatBazaar is a separate e-commerce project (3 instances: Mumbai/Delhi/Bangalore)
2. NeuralFlow monitors via REST API polling (1s interval)
3. Stress is injected via controlled API (`POST /api/demo/stress`)
4. Traffic is routed through weighted proxy (port 5100)
5. Frontend shows purple "BHARATBAZAAR — NEURALFLOW AI PROTECTING THIS APPLICATION" banner

### BharatBazaar Nodes:
| Node | City | Port | Traffic Weight |
|------|------|------|---------------|
| BB-NODE-1 | Mumbai | 5001 | 20% (after reroute) |
| BB-NODE-2 | Delhi | 5002 | 25% |
| BB-NODE-3 | Bangalore | 5003 | 55% (receives rerouted traffic) |

### Key Point:
- All AI detection, prediction, and rerouting logic is **identical** for both INTERNAL and EXTERNAL modes
- Only the data source changes (simulated HTTP servers vs real e-commerce API)
- **REROUTE ≠ STOP**: AI NEVER stops the load generator — it shifts traffic, maintaining service availability

---

## 13. KEY DEMO SCRIPT (What to show judges)

### Demo Flow (5 minutes):

**1. Introduction (1 min)**
- "NeuralFlow is an autonomous AI infrastructure protection system"
- Show the dashboard with 3D topology
- Explain: 3 nodes, real-time monitoring, AI decides when to reroute

**2. AI Mode Demo (2 min)**
- Switch to EXTERNAL mode (BharatBazaar)
- Start traffic (intensity 80)
- Watch: DETECTED → PREDICTED → REROUTING → VERIFYING → NORMAL
- Point out: AI Decision Summary panel showing WHY, confidence, response time
- Show 3D topology: Node 1 turns red, traffic shifts to Node 3
- **"Total AI response time: 1.0 second"**

**3. Manual Mode Demo (1.5 min)**
- Switch to MANUAL mode
- Start same attack
- Show timer counting up, revenue loss increasing
- Click REROUTE manually
- Show Comparison page: AI (1.0s) vs Human (X.Xs)
- **"AI was X.X times faster with zero errors"**

**4. Monitoring Deep Dive (0.5 min)**
- Show Live Monitoring page with health scores
- Show Reports page with event timeline
- Show Settings page

**5. Q&A Ready**
- "What if AI reroutes to a bad node?" → Candidate health must be >60
- "What about false positives?" → 3-consecutive-check verification
- "Can it handle multiple simultaneous attacks?" → Currently single-incident, designed for demo
- "What about production?" → Architecture supports it, demo uses simulation

---

## 14. PORT MAP (Technical Reference)

| Port | Service | Description |
|------|---------|-------------|
| 3001 | NeuralFlow Backend | REST API + WebSocket server |
| 4000 | Internal Router | Weighted random proxy (INTERNAL mode) |
| 4001-4003 | Internal Nodes | Simulated HTTP servers (Testfire/Zero/VulnWeb) |
| 5001-5003 | BharatBazaar Nodes | Real e-commerce instances (Mumbai/Delhi/Bangalore) |
| 5100 | External Router | Weighted random proxy (EXTERNAL mode) |
| 5173 | Frontend | Vite dev server (React SPA) |

---

## 15. SUMMARY

| Aspect | Detail |
|--------|--------|
| **Project** | NeuralFlow V3 — Autonomous AI Infrastructure Protection |
| **Problem** | Human reaction time (5-15 min) causes lakhs in revenue loss during node failures |
| **Solution** | AI detects in 5s, predicts breach, reroutes in 1s — zero human intervention |
| **USP** | Only system combining monitoring + prediction + auto-rerouting + explainability + revenue tracking |
| **AI Model** | Brain.js feedforward NN (9→12→8→6→3) + deterministic rules |
| **Tech Stack** | Node.js + Express + React 18 + Three.js + brain.js + WebSocket |
| **Pages** | Dashboard (3D), Monitoring, AI vs Human, Reports, Settings |
| **Modes** | AI (autonomous) vs Manual (human-in-the-loop) |
| **Environments** | Internal (simulated) vs External (BharatBazaar real app) |
| **Key Metric** | AI: 1.0s response | Human: 5-15s response → 5-15× faster |
| **Revenue Model** | $0.15 per failed request, tracked in real-time |

---

*NeuralFlow V3 — Where AI Protects, Humans Observe.*
