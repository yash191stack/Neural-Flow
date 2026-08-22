// NeuralFlow V3 - Backend Server
// Supports two environments:
//   INTERNAL — internal demo nodes (appNode.js child processes on ports 4001-4003)
//   EXTERNAL — BharatBazaar e-commerce nodes on ports 5001-5003
// The entire AI engine, prediction, and rerouting code is unchanged and operates
// on `activeNodes` — a reference that points to whichever environment is live.

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http  from 'http';
import https from 'https';
import cors from 'cors';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

import NeuralAgent        from './agentML.js';
import EventStore         from './eventStore.js';
import NodeSimulator      from './nodeSimulator.js';
import ExternalNodeAdapter from './externalNodeAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PID_FILE = path.join(PROJECT_ROOT, 'backend.pid');

// ============================================================================
// SINGLE-INSTANCE GUARD — runs BEFORE anything is created/bound.
// Guarantees only ONE healthy NeuralFlow backend exists on :3001.
// A second `node backend/src/server.js` (or `./start.sh`) exits silently if
// the existing instance is healthy. Stale/orphaned PID files are cleaned.
// ============================================================================

function httpGetJson(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => resolve(err.code === 'EADDRINUSE'))
      .once('listening', () => { tester.close(); resolve(false); })
      .listen(port);
  });
}

async function singleInstanceGuard() {
  const HEALTH_URL = 'http://localhost:3001/api/health';

  // 1. PID file present? Verify the PID is alive AND actually responds as NeuralFlow.
  if (fs.existsSync(PID_FILE)) {
    let pid = NaN;
    try { pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10); } catch {}
    if (!isNaN(pid) && pid !== process.pid) {
      let alive = false;
      try { process.kill(pid, 0); alive = true; } catch {}
      if (alive) {
        const health = await httpGetJson(HEALTH_URL, 3000);
        if (health && (health.status === 'running' || health.success === true)) {
          console.log(`🛑 NeuralFlow already running on :3001 (PID ${pid}) — exiting duplicate instance.`);
          process.exit(0);
        }
        // PID alive but health check failed — it is NOT the NeuralFlow we want.
        console.log(`⚠️  PID ${pid} alive but :3001 health check failed — treating PID file as stale.`);
      } else {
        console.log(`⚠️  Stale PID ${pid} in backend.pid (process is dead) — removing.`);
      }
      try { fs.unlinkSync(PID_FILE); } catch {}
    }
  }

  // 2. Port 3001 already bound by another process? If it answers health, it is us — exit.
  const portBusy = await isPortInUse(3001);
  if (portBusy) {
    const health = await httpGetJson(HEALTH_URL, 3000);
    if (health && (health.status === 'running' || health.success === true)) {
      console.log('🛑 NeuralFlow already healthy on :3001 — exiting duplicate instance.');
      process.exit(0);
    }
    console.log('⚠️  Port 3001 is busy but does not answer as NeuralFlow — starting anyway (port conflict will surface clearly).');
  }

  // 3. All clear — claim ownership with our PID.
  try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch (e) { console.error('⚠️  Could not write PID file:', e.message); }
  console.log(`🔒 NeuralFlow single-instance lock acquired (PID ${process.pid}) → ${PID_FILE}`);

  // 4. Post-acquire re-check — closes the simultaneous-start race where two
  //    instances both passed step 2. If another instance won the race to :3001,
  //    bow out cleanly WITHOUT touching its PID file.
  const nowBusy = await isPortInUse(3001);
  if (nowBusy) {
    const health = await httpGetJson(HEALTH_URL, 3000);
    if (health && (health.status === 'running' || health.success === true)) {
      console.log('🛑 Another NeuralFlow instance won the race on :3001 — exiting gracefully.');
      removeOwnPidFile();
      process.exit(0);
    }
  }
}

await singleInstanceGuard();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ============================================================================
// INITIALIZE SYSTEMS
// ============================================================================

const eventStore  = new EventStore(1000);
const neuralAgent = new NeuralAgent();

// ── Internal nodes (always alive, drive the internal demo) ───────────────────
const internalNodes = [
  new NodeSimulator(1, 'Testfire Bank', 'US Server',   60),
  new NodeSimulator(2, 'Zero Bank',     'EU Server',   25),
  new NodeSimulator(3, 'VulnWeb PHP',   'Asia Server', 15),
];

// ── External nodes (BharatBazaar adapters) ───────────────────────────────────
const externalNodes = [
  new ExternalNodeAdapter(1, 'BB-NODE-1', 'Mumbai',    60, process.env.EXTERNAL_NODE_1_URL || 'http://localhost:5001'),
  new ExternalNodeAdapter(2, 'BB-NODE-2', 'Delhi',     25, process.env.EXTERNAL_NODE_2_URL || 'http://localhost:5002'),
  new ExternalNodeAdapter(3, 'BB-NODE-3', 'Bangalore', 15, process.env.EXTERNAL_NODE_3_URL || 'http://localhost:5003'),
];

// ── Active set — ALL AI/routing logic reads this reference ───────────────────
let activeEnvironment = 'INTERNAL';   // 'INTERNAL' | 'EXTERNAL'
let activeNodes       = internalNodes; // pointer — reassigned on /api/environment

// ── Shared mutable state ─────────────────────────────────────────────────────
let systemMode    = 'AI';
let rerouteGeneration = 0;
let manualModeState = {
  isActive: false, attackStartTime: null,
  elapsedTime: 0,  failedRequests: 0,
  revenueLoss: 0,  attackedNodeId: null,
};

let activePlaybook      = null;
let lastAIDecision      = null;
let failedRequestsCount = 0;
let lastRerouteTime     = 0;
const REROUTE_COOLDOWN_MS = 15000;

let activeIncidentDetails = null;
let lastIncidentReport    = null;

let incident = {
  state: 'NORMAL',
  nodeId: null, targetNodeId: null,
  detectedLatency: 0, predictedBreach: null,
  cooldownExpiry: 0,  verificationCount: 0,
};

const serverStartTime = Date.now();

let stats = {
  attacksDetected: 0, attacksBlocked: 0,
  avgResponseTime: null, totalAIResponseMs: 0,
  predictions: { total: 0, correct: 0, falsePositives: 0 },
};

// ── Cleanup ───────────────────────────────────────────────────────────────────
function removeOwnPidFile() {
  // Only remove the PID file if it actually belongs to THIS process.
  // A duplicate instance that exits early must NOT delete the healthy
  // instance's PID file.
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      if (pid === process.pid) fs.unlinkSync(PID_FILE);
    }
  } catch {}
}

const cleanupProcesses = () => {
  console.log('🔌 Shutting down...');
  internalNodes.forEach(n => n.destroy());
  externalNodes.forEach(n => n.destroy());
  removeOwnPidFile();
};

// Robust global crash diagnostics
process.on('uncaughtException', (err) => {
  console.error('🔥 FATAL UNCAUGHT EXCEPTION:', err);
  if (err && err.stack) {
    console.error(err.stack);
  }
  try { cleanupProcesses(); } catch (_) {}
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 FATAL UNHANDLED PROMISE REJECTION:', reason);
  if (reason && reason.stack) {
    console.error(reason.stack);
  }
});

process.on('SIGINT',  () => { cleanupProcesses(); process.exit(0); });
process.on('SIGTERM', () => { cleanupProcesses(); process.exit(0); });
process.on('exit', () => {
  // Last-resort PID file removal — only if it belongs to this process.
  removeOwnPidFile();
});

// ============================================================================
// NEURAL NETWORK TRAINING
// ============================================================================

console.log('🧠 Training neural network...');
neuralAgent.trainModel(500, 2000).then(() => {
  console.log('✅ Neural network ready!');
  eventStore.addEvent('INFO', null,
    `Neural network trained - Accuracy: ${neuralAgent.accuracy.toFixed(1)}%`, 'LOW',
    { accuracy: neuralAgent.accuracy });
  broadcastToAll({ type: 'model_trained', data: neuralAgent.getPerformanceMetrics() });
});

// ============================================================================
// LOAD GENERATOR  (works for both environments — port is set by start())
// ============================================================================

class LoadGenerator {
  constructor() {
    this.isActive    = false;
    this.intensity   = 0;
    this.intervalId  = null;
    this.targetNodeId = null;
    this.targetPort  = null;
    this.requestsSent = 0;
    this.requestsDone = 0;
    this._pendingRestart = null;
    this.agent = new http.Agent({ keepAlive: true, maxSockets: 500 });
  }

  // targetPort: explicit port to hit (e.g. 5001 for BB-NODE-1).
  // If null → uses proxy port (4000 internal / 5000 external).
  start(intensity, targetNodeId = null, targetPort = null) {
    this.stop();
    this.isActive     = true;
    this.intensity    = intensity;
    this.targetNodeId = targetNodeId;

    if (targetPort !== null) {
      this.targetPort = targetPort;
    } else if (targetNodeId) {
      // Default: route to the node's own port based on active environment
      this.targetPort = activeEnvironment === 'EXTERNAL'
        ? 5000 + targetNodeId   // BB-NODE-X
        : 4000 + targetNodeId;  // internal appNode-X
    } else {
      // No specific target → proxy / load-balancer
      this.targetPort = activeEnvironment === 'EXTERNAL' ? 5100 : 4000;
    }

    this.requestsSent = 0;
    this.requestsDone = 0;
    console.log(`🚀 Load generator: ${intensity} req/s → port ${this.targetPort}`);

    const TICK_MS    = 50;
    const reqPerTick = Math.max(1, Math.ceil(intensity / (1000 / TICK_MS)));
    this.intervalId  = setInterval(() => {
      if (!this.isActive) return;
      for (let i = 0; i < reqPerTick; i++) this._sendRequest();
    }, TICK_MS);
  }

  stop() {
    this.isActive = false;
    if (this.intervalId)    { clearInterval(this.intervalId);   this.intervalId    = null; }
    if (this._pendingRestart) { clearTimeout(this._pendingRestart); this._pendingRestart = null; }
  }

  _sendRequest() {
    if (!this.isActive) return;
    this.requestsSent++;
    const req = http.request({
      hostname: 'localhost', port: this.targetPort,
      path: '/', method: 'GET', agent: this.agent,
    }, (res) => { res.resume(); this.requestsDone++; });
    req.on('error',   () => {});
    req.setTimeout(3000, () => req.destroy());
    req.end();
  }
}

const loadGenerator = new LoadGenerator();

// ============================================================================
// ROUTER / PROXY  (shared handler — parametrised by the active node list)
// The same function is registered on port 4000 (internal) AND port 5000 (external).
// Each server uses `activeNodes` at request-time, so weight changes are reflected
// immediately without restarting either server.
// ============================================================================

function makeRouterHandler() {
  return (req, res) => {
    const nodes = activeNodes; // read at request-time

    // Filter to healthy/reachable nodes if any are online
    const reachableNodes = nodes.filter(n => n.metrics.health > 0);
    const candidateNodes = reachableNodes.length > 0 ? reachableNodes : nodes;

    // Weighted random selection based on current dynamic weights
    const r   = Math.random() * 100;
    let   sum = 0;
    let targetNode = null;
    for (const n of candidateNodes) {
      sum += n.metrics.traffic;
      if (r <= sum) { targetNode = n; break; }
    }
    if (!targetNode) targetNode = candidateNodes[0];

    const targetPort = parseInt(targetNode.port, 10) || 5001;
    const targetHost = targetNode.hostname || 'localhost';

    const headers = { ...req.headers, host: `${targetHost}:${targetPort}` };

    // Select http or https based on the target node's configured protocol
    const proxyAgent = (targetNode.protocol === 'https:') ? https : http;
    const proxyReq = proxyAgent.request({
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
}, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'x-served-by': `${targetNode.name}:${targetPort}`,
      });
      proxyRes.pipe(res);
      if (proxyRes.statusCode >= 500) failedRequestsCount++;
    });

    proxyReq.on('error', (err) => {
      console.error(`[Router Proxy Error] -> :${targetPort}${req.url}:`, err.message);
      res.writeHead(502);
      res.end('Bad Gateway');
      failedRequestsCount++;
    });

    req.pipe(proxyReq);
  };
}

// Internal router — port 4000 (always available)
const internalRouter = http.createServer(makeRouterHandler());
internalRouter.listen(4000, () => console.log('🔌 Internal router listening on port 4000'));

// External router — port 5100 (always available; only useful when env=EXTERNAL)
// NOTE: port 5000 is reserved by macOS Control Centre on some systems, so we use 5100.
const externalRouter = http.createServer(makeRouterHandler());
externalRouter.listen(5100, () => console.log('🔌 External router listening on port 5100'));

// ============================================================================
// WEBSOCKET BROADCAST
// ============================================================================

function broadcastToAll(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(message));
  });
}

// ============================================================================
// AI DECISION ENGINE  (unchanged — operates on activeNodes)
// ============================================================================

function getLatencySlope(node) {
  const history = node.latencyHistory || [];
  const N = history.length;
  if (N < 5) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < N; i++) {
    sumX += i; sumY += history[i];
    sumXY += i * history[i]; sumXX += i * i;
  }
  return (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
}

function shiftTrafficWeights(fromNode, toNode, shiftAmount) {
  const actual = Math.min(shiftAmount, fromNode.metrics.traffic);
  fromNode.metrics.traffic -= actual;
  toNode.metrics.traffic   += actual;

  activeNodes.forEach(n => { n.metrics.traffic = Math.round(n.metrics.traffic); });

  let total = activeNodes.reduce((s, n) => s + n.metrics.traffic, 0);
  if (total !== 100) toNode.metrics.traffic = Math.max(0, toNode.metrics.traffic + (100 - total));
}

function runAIDecisionEngine() {
  // Neural network predictions (feature attribution — no logic change)
  activeNodes.forEach(node => {
    const st = node.getState();
    if (neuralAgent.isTrained) {
      neuralAgent.predict({
        latency: st.latency, errorRate: st.errorRate, queueSize: 0,
        cpuUsage: st.cpu, memoryUsage: st.memory,
        requestsPerSecond: st.requestsPerSecond,
        latencyTrend: st.latencyTrend, errorTrend: 0,
      });
    }
  });

  const now = Date.now();

  // ── Incident State Machine ───────────────────────────────────────────────
  if (incident.state === 'NORMAL') {
    const degradedNode = activeNodes.find(node => {
      const st    = node.getState();
      const slope = getLatencySlope(node);
      // A node that is ALREADY critical is decisive telemetry on its own.
      // This includes nodes marked offline (latency=9999, health=0, rps=0) —
      // an unresponsive node MUST still be detected so traffic is rerouted
      // away from it. The RPS gate would otherwise block detection entirely,
      // because offline nodes report requestsPerSecond = 0.
      const alreadyCritical = st.latency >= 280 || st.health <= 0 || st.status === 'CRITICAL';
      // Early-warning path (rising trend) still requires real load evidence
      // so a single noisy sample never triggers a decision.
      const risingTrend     = st.latency > 100 && slope > 8 && st.requestsPerSecond > 15;
      return alreadyCritical || risingTrend;
    });

    if (degradedNode) {
      const st    = degradedNode.getState();
      const slope = getLatencySlope(degradedNode);
      incident.state   = 'DETECTED';
      incident.nodeId  = degradedNode.nodeId;
      incident.detectedLatency = st.latency;

      const prevLatency    = slope > 0 ? Math.round(st.latency - slope) : st.latency;
      const detectionReason = slope > 8
        ? `latency rising rapidly: ${prevLatency}ms → ${st.latency}ms (slope: +${slope.toFixed(1)}ms/s)`
        : `latency already critical: ${st.latency}ms (fast-path detection)`;

      console.log(`[DIAG AI] Incident DETECTED on node ${degradedNode.nodeId} (${degradedNode.name}): latency=${st.latency}ms, rps=${st.requestsPerSecond}, slope=${slope.toFixed(1)} [env=${activeEnvironment}, mode=${systemMode}]`);

      eventStore.addEvent('ALERT', degradedNode.nodeId,
        `⚠️ ${degradedNode.name} degradation detected — ${detectionReason}`, 'MEDIUM');
      broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
      broadcastState();

      activeIncidentDetails = {
        id: 'INC-' + Math.floor(100000 + Math.random() * 900000),
        timestamp: Date.now(), nodeId: degradedNode.nodeId, mode: systemMode,
        peakLatency: st.latency, peakRps: st.requestsPerSecond,
        peakErrorRate: st.errorRate, slope,
        predictedBreach: null,
        beforeWeights: activeNodes.map(n => ({ nodeId: n.nodeId, traffic: n.metrics.traffic })),
        afterWeights: null, decisionTimeMs: null, recoveryTimeSec: null, targetNodeId: null,
      };
    }
  }

  else if (incident.state === 'DETECTED') {
    const node = activeNodes.find(n => n.nodeId === incident.nodeId);
    if (!node) { incident.state = 'NORMAL'; return; }
    const st = node.getState();

    if (activeIncidentDetails) {
      activeIncidentDetails.peakLatency   = Math.max(activeIncidentDetails.peakLatency,   st.latency);
      activeIncidentDetails.peakRps       = Math.max(activeIncidentDetails.peakRps,       st.requestsPerSecond);
      activeIncidentDetails.peakErrorRate = Math.max(activeIncidentDetails.peakErrorRate, st.errorRate);
    }

    const alreadyBreached = st.latency >= 300;
    const hasPrediction   = st.predictedBreach !== null && st.predictedBreach <= 25;
    // For EXTERNAL mode: require at least 3 latency observations before
    // triggering PREDICTED — this gives the AI a real trend window (~3s)
    // instead of firing on a single stressed sample.
    // INTERNAL mode keeps its original fast-path behaviour unchanged.
    // A node that is ALREADY breached (or offline: latency=9999) is decisive
    // on its own — offline nodes stop growing latencyHistory, so the history
    // gate must not block rerouting away from a node that is already down.
    const hasEnoughHistory = activeEnvironment === 'EXTERNAL'
      ? (alreadyBreached || (node.latencyHistory || []).length >= 5)
      : true;
    if ((hasPrediction || alreadyBreached) && hasEnoughHistory) {
      const breachNote = alreadyBreached && st.predictedBreach === 0
        ? 'ALREADY BREACHED' : `~${st.predictedBreach}s`;
      incident.state          = 'PREDICTED';
      incident.predictedBreach = st.predictedBreach ?? 0;
      if (activeIncidentDetails) activeIncidentDetails.predictedBreach = incident.predictedBreach;

      console.log(`[DIAG AI] Incident PREDICTED on node ${node.nodeId} (${node.name}): breachNote=${breachNote}, predictedBreach=${incident.predictedBreach}`);

      eventStore.addEvent('ALERT', node.nodeId,
        `🧠 Degradation predicted: ${node.name} breach expected in ${breachNote}`, 'HIGH');
      broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
      broadcastState();
    }
  }

  else if (incident.state === 'PREDICTED') {
    const node = activeNodes.find(n => n.nodeId === incident.nodeId);
    if (!node) { incident.state = 'NORMAL'; return; }
    const st = node.getState();

    if (activeIncidentDetails) {
      activeIncidentDetails.peakLatency   = Math.max(activeIncidentDetails.peakLatency,   st.latency);
      activeIncidentDetails.peakRps       = Math.max(activeIncidentDetails.peakRps,       st.requestsPerSecond);
      activeIncidentDetails.peakErrorRate = Math.max(activeIncidentDetails.peakErrorRate, st.errorRate);
    }

    if (systemMode === 'AI') {
      incident.state   = 'REROUTING';
      const candList   = activeNodes.filter(n => n.nodeId !== node.nodeId && n.metrics.health > 60);
      const candInfo   = candList.map(c => `${c.name} (${c.metrics.health}% health, ${c.metrics.latency}ms)`).join(', ');

      console.log(`[DIAG AI] Incident PREDICTED -> REROUTING. Candidate nodes: [${candInfo}]`);

      eventStore.addEvent('INFO', null,
        `🤖 AI EVALUATION: Evaluating healthy target nodes... Candidates: [${candInfo}]`, 'MEDIUM');
      broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
      broadcastState();

      const capturedGeneration = rerouteGeneration;
      setTimeout(() => {
        if (rerouteGeneration !== capturedGeneration) {
          console.log(`[DIAG AI] Reroute generation mismatch: captured=${capturedGeneration}, current=${rerouteGeneration}`);
          return;
        }
        console.log(`[DIAG AI] Calling executeAIReroute for node ${node.nodeId} (${node.name})`);
        executeAIReroute(node, st.predictedBreach);
      }, 800);

    } else {
      incident.state              = 'ACTION_PENDING';
      manualModeState.isActive    = true;
      manualModeState.attackStartTime = Date.now();
      manualModeState.elapsedTime = 0;
      manualModeState.failedRequests  = 0;
      manualModeState.revenueLoss = 0;
      manualModeState.attackedNodeId  = node.nodeId;
      manualModeState.detectedLatency = st.latency;
      manualModeState.detectedRps     = st.requestsPerSecond;
      failedRequestsCount = 0;

      eventStore.addEvent('ALERT', node.nodeId,
        `👤 HUMAN INTERVENTION REQUIRED — ${node.name} is degrading ` +
        `(${st.latency}ms · ${st.requestsPerSecond} RPS · ${st.health}% health). Operator action needed.`,
        'CRITICAL');
      broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
      eventStore.addEvent('ALERT', node.nodeId,
        `⏱ Human response timer started — incident unresolved at ${st.latency}ms latency (threshold: 300ms)`, 'HIGH');
      broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
      broadcastState();
    }
  }

  else if (incident.state === 'VERIFYING') {
    const node = activeNodes.find(n => n.nodeId === incident.nodeId);
    if (!node) { incident.state = 'NORMAL'; return; }
    const st = node.getState();

    if (activeIncidentDetails) {
      activeIncidentDetails.peakLatency   = Math.max(activeIncidentDetails.peakLatency,   st.latency);
      activeIncidentDetails.peakRps       = Math.max(activeIncidentDetails.peakRps,       st.requestsPerSecond);
      activeIncidentDetails.peakErrorRate = Math.max(activeIncidentDetails.peakErrorRate, st.errorRate);
    }

    // Real telemetry check: node is verified recovered when latency returns below 120ms
    // and health score returns to healthy (>= 70%)
    if (st.latency < 120 && st.health >= 70) {
      incident.verificationCount++;
      if (incident.verificationCount >= 3) {
        incident.state = 'RESOLVED';
      }
    } else {
      incident.verificationCount = 0;
    }
  }

  else if (incident.state === 'RESOLVED') {
    const node     = activeNodes.find(n => n.nodeId === incident.nodeId);
    const nodeName = node ? node.name : `Node ${incident.nodeId}`;

    if (activeIncidentDetails) {
      activeIncidentDetails.recoveryTimeSec = Math.round((Date.now() - activeIncidentDetails.timestamp) / 1000);
      lastIncidentReport = {
        ...activeIncidentDetails,
        weights: activeNodes.map(n => ({
          nodeId: n.nodeId,
          before: (activeIncidentDetails.beforeWeights.find(w => w.nodeId === n.nodeId) || {}).traffic || 0,
          after:  n.metrics.traffic,
        })),
      };
      activeIncidentDetails = null;
    }

    eventStore.addEvent('RECOVERY', incident.nodeId,
      `✓ Recovery verified: ${nodeName} has fully recovered to healthy levels.`, 'MEDIUM');
    broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
    eventStore.addEvent('INFO', null,
      `● System stabilized: Entering cooldown period. State normalized.`, 'LOW');
    broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });

    incident.state        = 'COOLDOWN';
    incident.cooldownExpiry = Date.now() + 10000;
    broadcastState();
  }

  else if (incident.state === 'COOLDOWN') {
    if (Date.now() > incident.cooldownExpiry) {
      incident.state           = 'NORMAL';
      incident.nodeId          = null;
      incident.targetNodeId    = null;
      incident.detectedLatency = 0;
      incident.predictedBreach = null;
      incident.verificationCount = 0;

      eventStore.addEvent('INFO', null, `Stabilization cooldown complete. System state: NORMAL.`, 'LOW');
      broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
      broadcastState();
    }
  }
}

// ============================================================================
// AI REROUTE EXECUTION  (unchanged — operates on activeNodes)
// ============================================================================

function executeAIReroute(fromNode, predictedBreach) {
  const now = Date.now();

  console.log(`[DIAG AI] executeAIReroute CALLED: fromNode=${fromNode.nodeId} (${fromNode.name}), lastRerouteTime=${lastRerouteTime}, elapsed=${now - lastRerouteTime}ms, cooldown=${REROUTE_COOLDOWN_MS}ms, loadGeneratorActive=${loadGenerator.isActive}`);

  if (now - lastRerouteTime < REROUTE_COOLDOWN_MS) {
    console.log(`⏸ AI reroute skipped — cooldown active (${now - lastRerouteTime}ms elapsed)`);
    incident.state = 'NORMAL';
    return;
  }

  const candidates = activeNodes.filter(n => n.nodeId !== fromNode.nodeId && n.metrics.health > 60);
  console.log(`[DIAG AI] Candidates evaluated: count=${candidates.length}, list=[${candidates.map(c => `${c.nodeId}:${c.name}(health=${c.metrics.health})`).join(', ')}]`);

  if (candidates.length === 0) {
    console.log('⚠️  No healthy candidate node found for reroute');
    incident.state = 'NORMAL';
    return;
  }

  const score  = n => n.metrics.health * 0.5 + Math.max(0, 300 - n.metrics.latency) * 0.3 +
                      Math.max(0, 100 - n.metrics.requestsPerSecond) * 0.2;
  const toNode = candidates.reduce((best, n) => score(n) > score(best) ? n : best, candidates[0]);

  const shiftAmount = 40;
  const fromState   = fromNode.getState();

  const beforeWeights = activeNodes.map(n => ({ nodeId: n.nodeId, traffic: n.metrics.traffic }));

  if (activeIncidentDetails) {
    activeIncidentDetails.targetNodeId  = toNode.nodeId;
    activeIncidentDetails.decisionTimeMs = Date.now() - activeIncidentDetails.timestamp;
  }

  shiftTrafficWeights(fromNode, toNode, shiftAmount);
  lastRerouteTime = now;

  const afterWeights = activeNodes.map(n => ({ nodeId: n.nodeId, traffic: n.metrics.traffic }));
  console.log(`[DIAG AI] Traffic weights shifted. Before: ${JSON.stringify(beforeWeights)} | After: ${JSON.stringify(afterWeights)}`);

  // AI REROUTE: Routing weights shifted.
  // Traffic generator CONTINUES running at full intensity.
  // Traffic is now distributed according to the new weights, naturally reducing
  // load on the degraded node and allowing it to recover while traffic stays live.
  incident.state            = 'VERIFYING';
  incident.targetNodeId     = toNode.nodeId;
  incident.verificationCount = 0;

  const actualResponseTimeMs  = activeIncidentDetails
    ? Math.min(9999, Date.now() - activeIncidentDetails.timestamp) : 0;
  const estimatedImpactAvoided = Math.round(failedRequestsCount * 0.15 * 100) / 100;

  const allScores  = candidates.map(score);
  const maxScore   = Math.max(...allScores);
  const decisionScore = maxScore > 0 ? Math.round((score(toNode) / maxScore) * 100) : 100;

  lastAIDecision = {
    fromNodeId: fromNode.nodeId, toNodeId: toNode.nodeId,
    timestamp:  new Date().toLocaleTimeString(),
    detectionTimestamp: activeIncidentDetails ? activeIncidentDetails.timestamp : Date.now(),
    actionTimestamp:    Date.now(),
    confidence:  decisionScore, responseTimeMs: actualResponseTimeMs,
    reasons: [
      `${fromNode.name} is flagged because latency is rising rapidly while current load is high (${fromState.latency}ms).`,
      `${toNode.name} was selected because it has low latency (${toNode.metrics.latency}ms), ` +
      `high health (${toNode.metrics.health}%) and sufficient available capacity (${toNode.metrics.requestsPerSecond} RPS).`,
    ],
    alternatives: activeNodes.map(n => {
      if (n.nodeId === fromNode.nodeId)
        return `${n.name} is the flagged source: latency=${n.metrics.latency}ms, health=${n.metrics.health}%.`;
      if (n.nodeId === toNode.nodeId)
        return `${n.name} selected as optimal: latency=${n.metrics.latency}ms, health=${n.metrics.health}%.`;
      return `${n.name} evaluated: latency=${n.metrics.latency}ms, health=${n.metrics.health}% (lower rank).`;
    }),
    comparison:    activeNodes.map(n => ({ nodeId: n.nodeId, name: n.name,
      latency: n.metrics.latency, health: n.metrics.health,
      requestsPerSecond: n.metrics.requestsPerSecond, errorRate: n.metrics.errorRate })),
    beforeWeights: beforeWeights,
    afterWeights:  afterWeights,
    estimatedSavings: estimatedImpactAvoided,
    environment: activeEnvironment,
  };

  stats.attacksBlocked++;
  stats.avgResponseTime = Math.round(stats.totalAIResponseMs / stats.attacksBlocked);

  broadcastState();
  console.log(`\n🤖 AI Decision: ${fromNode.name} → ${toNode.name} (+${shiftAmount}%) [${activeEnvironment}]`);

  eventStore.addEvent('AI_DECISION', toNode.nodeId,
    `🤖 AUTONOMOUS DECISION — ${toNode.name} selected: ${toNode.metrics.health}% health · ` +
    `${toNode.metrics.latency}ms latency · ${toNode.metrics.requestsPerSecond} RPS`, 'MEDIUM');
  broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });

  eventStore.addEvent('REROUTE', fromNode.nodeId,
    `↗ Traffic rerouted — ${fromNode.name}: ${fromNode.metrics.traffic + shiftAmount}% → ` +
    `${fromNode.metrics.traffic}% | ${toNode.name}: ${toNode.metrics.traffic - shiftAmount}% → ${toNode.metrics.traffic}%`,
    'CRITICAL',
    { fromNodeId: fromNode.nodeId, toNodeId: toNode.nodeId, shiftAmount, predictedBreach });
  broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });

  eventStore.addEvent('ALERT', fromNode.nodeId,
    `🛑 Controlled traffic contained — load redirected away from ${fromNode.name} · ` +
    `AI response time: ${lastAIDecision.responseTimeMs}ms`, 'HIGH');
  broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });

  broadcastToAll({ type: 'reroute',
    data: { fromNodeId: fromNode.nodeId, toNodeId: toNode.nodeId, ai: true, shiftAmount } });

  executePlaybookAnimation('isolate_reroute');
}

function executePlaybookAnimation(key) {
  const playbooks = {
    isolate_reroute: {
      name: 'Isolate & Reroute Protocol',
      steps: [
        { id: '1', action: 'Detect anomaly and analyze trend',         status: 'pending' },
        { id: '2', action: 'Evaluate health of candidate nodes',       status: 'pending' },
        { id: '3', action: 'Execute graceful traffic rerouting',       status: 'pending' },
        { id: '4', action: 'Verify recovery and target stability',     status: 'pending' },
      ],
    },
  };

  activePlaybook = JSON.parse(JSON.stringify(playbooks[key]));
  const broadcast = () => broadcastToAll({ type: 'playbook_started', data: activePlaybook });

  activePlaybook.steps[0].status = 'running'; broadcast();
  setTimeout(() => { if (!activePlaybook) return; activePlaybook.steps[0].status = 'done'; activePlaybook.steps[1].status = 'running'; broadcast(); }, 400);
  setTimeout(() => { if (!activePlaybook) return; activePlaybook.steps[1].status = 'done'; activePlaybook.steps[2].status = 'running'; broadcast(); }, 800);
  setTimeout(() => { if (!activePlaybook) return; activePlaybook.steps[2].status = 'done'; activePlaybook.steps[3].status = 'running'; broadcast(); }, 1200);
  setTimeout(() => { if (!activePlaybook) return; activePlaybook.steps[3].status = 'done'; broadcast(); }, 1600);
  setTimeout(() => { activePlaybook = null; broadcastState(); }, 3000);
}

// ============================================================================
// MANUAL MODE
// ============================================================================

function updateManualMode() {
  if (!manualModeState.isActive || systemMode !== 'MANUAL') return;

  const elapsed = (Date.now() - manualModeState.attackStartTime) / 1000;
  manualModeState.elapsedTime    = elapsed;
  manualModeState.failedRequests = failedRequestsCount;
  manualModeState.revenueLoss    = failedRequestsCount * 0.15;

  const elapsedRounded = Math.round(elapsed);
  if (elapsedRounded > 0 && elapsedRounded % 5 === 0 && !manualModeState._lastLoggedSec) {
    manualModeState._lastLoggedSec = elapsedRounded;
    const attackedNode = activeNodes.find(n => n.nodeId === manualModeState.attackedNodeId);
    if (attackedNode) {
      eventStore.addEvent('ALERT', manualModeState.attackedNodeId,
        `⏱ Incident unresolved — ${elapsed.toFixed(1)}s elapsed · ${attackedNode.metrics.latency}ms latency · ` +
        `${failedRequestsCount} failed requests · $${(failedRequestsCount * 0.15).toFixed(2)} revenue impact`, 'HIGH');
      broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
    }
  } else if (manualModeState._lastLoggedSec && elapsedRounded !== manualModeState._lastLoggedSec) {
    if (elapsedRounded % 5 !== 0) manualModeState._lastLoggedSec = null;
  }
}

// ============================================================================
// MAIN LOOP
// ============================================================================

function mainLoop() {
  activeNodes.forEach(n => n.update());
  runAIDecisionEngine();
  updateManualMode();
}

function broadcastState() {
  const uptimeSec = Math.floor((Date.now() - serverStartTime) / 1000);
  broadcastToAll({
    type: 'state',
    data: {
      nodes:             activeNodes.map(n => n.getState()),
      mode:              systemMode,
      environment:       activeEnvironment,
      manualModeState,
      activePlaybook,
      lastAIDecision,
      lastIncidentReport,
      stats,
      incident,
      modelPerformance:  neuralAgent.getPerformanceMetrics(),
      serverUptime:      { seconds: uptimeSec, minutes: Math.floor(uptimeSec / 60), hours: Math.floor(uptimeSec / 3600) },
      attackStats: {
        totalAttacks:  stats.attacksDetected,
        activeAttacks: loadGenerator.isActive ? 1 : 0,
        attacksByType: { TrafficSpike: stats.attacksDetected },
        lastAttackTime: Date.now(),
      },
    },
  });
}

setInterval(mainLoop,      100);
setInterval(broadcastState, 1000);

// ============================================================================
// WEBSOCKET
// ============================================================================

wss.on('connection', (ws) => {
  console.log('✅ Client connected');

  ws.send(JSON.stringify({ type: 'event_history', data: eventStore.getAllEvents() }));

  ws.send(JSON.stringify({
    type: 'state',
    data: {
      nodes: activeNodes.map(n => n.getState()),
      mode: systemMode, environment: activeEnvironment,
      manualModeState, activePlaybook, lastAIDecision,
      lastIncidentReport, stats, incident,
      modelPerformance: neuralAgent.getPerformanceMetrics(),
      serverUptime: { seconds: Math.floor((Date.now() - serverStartTime) / 1000) },
      attackStats: { totalAttacks: stats.attacksDetected, activeAttacks: loadGenerator.isActive ? 1 : 0,
        attacksByType: { TrafficSpike: stats.attacksDetected }, lastAttackTime: Date.now() },
    },
  }));

  ws.send(JSON.stringify({ type: 'model_status', data: neuralAgent.getPerformanceMetrics() }));
});

// ============================================================================
// REST API — all existing endpoints preserved; new ones added below
// ============================================================================

// Mode switch
app.post('/api/mode', (req, res) => {
  systemMode = req.body.mode;
  console.log(`\n🔄 MODE SWITCHED: ${systemMode}`);
  eventStore.addEvent('INFO', null, `Mode switched to ${systemMode}`, 'LOW');
  broadcastToAll({ type: 'mode_changed', data: { mode: systemMode } });
  res.json({ success: true, mode: systemMode });
});

// ── NEW: Environment switch ───────────────────────────────────────────────────
app.post('/api/environment', (req, res) => {
  const env = (req.body.environment || '').toUpperCase();
  if (env !== 'INTERNAL' && env !== 'EXTERNAL') {
    return res.status(400).json({ error: 'environment must be INTERNAL or EXTERNAL' });
  }
  if (env === activeEnvironment) {
    return res.json({ success: true, environment: activeEnvironment, changed: false });
  }

  console.log(`\n🌐 ENVIRONMENT SWITCH: ${activeEnvironment} → ${env}`);

  // Stop any running load generator and end attacks on the old set
  loadGenerator.stop();
  activeNodes.forEach(n => n.endAttack());

  // Reset incident/session state
  rerouteGeneration++;
  lastAIDecision      = null;
  activePlaybook      = null;
  failedRequestsCount = 0;
  lastRerouteTime     = 0;
  activeIncidentDetails = null;

  incident = {
    state: 'NORMAL', nodeId: null, targetNodeId: null,
    detectedLatency: 0, predictedBreach: null,
    cooldownExpiry: 0,  verificationCount: 0,
  };

  stats = {
    attacksDetected: 0, attacksBlocked: 0,
    avgResponseTime: null, totalAIResponseMs: 0,
    predictions: { total: 0, correct: 0, falsePositives: 0 },
  };

  manualModeState = {
    isActive: false, attackStartTime: null, elapsedTime: 0,
    failedRequests: 0, revenueLoss: 0, attackedNodeId: null,
  };

  // Switch the active pointer
  activeEnvironment = env;
  activeNodes       = env === 'EXTERNAL' ? externalNodes : internalNodes;

  eventStore.clear();
  const envLabel = env === 'EXTERNAL' ? 'BharatBazaar (External)' : 'Internal Demo';
  eventStore.addEvent('INFO', null,
    `🌐 Environment switched to ${envLabel} — NeuralFlow AI engine is now monitoring ${envLabel}`, 'LOW');

  broadcastToAll({ type: 'demo_reset',          data: {} });
  broadcastToAll({ type: 'environment_changed', data: { environment: env } });
  broadcastState();
  broadcastToAll({ type: 'event_history',       data: eventStore.getAllEvents() });

  res.json({ success: true, environment: activeEnvironment, changed: true });
});

// ── NEW: external environment health check ───────────────────────────────────
app.get('/api/external/health', async (req, res) => {
  const results = await Promise.all(externalNodes.map(n =>
    new Promise(resolve => {
      // Use the node's actual configured base URL so remote HTTPS nodes are reached correctly
      const targetUrl = new URL('/api/health', n.url);
      const agent = targetUrl.protocol === 'https:' ? https : http;
      agent.get(targetUrl.toString(), { timeout: 2000 }, r => {
        let d = '';
        r.on('data', c => { d += c; });
        r.on('end', () => {
          try { resolve({ nodeId: n.nodeId, name: n.name, port: n.port, ...JSON.parse(d), reachable: true }); }
          catch { resolve({ nodeId: n.nodeId, name: n.name, port: n.port, reachable: false }); }
        });
      }).on('error', () => resolve({ nodeId: n.nodeId, name: n.name, port: n.port, reachable: false }));
    })
  ));
  const allReachable = results.every(r => r.reachable);
  res.json({ success: true, allReachable, nodes: results });
});

// Launch attack / traffic spike
app.post('/api/attack/start', (req, res) => {
  let rawNodeId   = req.body.nodeId ?? req.body.targetNodeId ?? 1;
  let parsedNodeId = typeof rawNodeId === 'string' && rawNodeId.startsWith('BB-NODE-')
    ? parseInt(rawNodeId.replace('BB-NODE-', ''), 10)
    : parseInt(rawNodeId, 10);
  if (isNaN(parsedNodeId)) parsedNodeId = 1;

  const attackType = req.body.attackType || req.body.type || 'TrafficSpike';
  const intensity  = req.body.intensity  || req.body.duration  || 75;

  const nodeId = parsedNodeId;
  const node   = activeNodes.find(n => n.nodeId === nodeId);
  if (!node) return res.status(400).json({ error: 'Node not found in active environment' });

  // Ensure initial traffic distribution puts high load on the target node (60%)
  if (node.metrics.traffic < 60) {
    const otherNodes = activeNodes.filter(n => n.nodeId !== nodeId);
    node.metrics.traffic = 60;
    if (otherNodes.length === 2) {
      otherNodes[0].metrics.traffic = 25;
      otherNodes[1].metrics.traffic = 15;
    }
  }

  // Reset lastRerouteTime on fresh attack launch so cooldown does not block new reroute
  lastRerouteTime = 0;

  console.log(`\n🚨 TRAFFIC SPIKE LAUNCHED: ${node.name} at ${intensity} RPS [${activeEnvironment}]`);
  node.startAttack(attackType, intensity);

  // Send load generator traffic through the router (:5100 external / :4000 internal)
  // so that requests are distributed dynamically according to node traffic weights!
  const routerPort = activeEnvironment === 'EXTERNAL' ? 5100 : 4000;
  loadGenerator.start(intensity, nodeId, routerPort);
  stats.attacksDetected++;

  if (systemMode === 'MANUAL') {
    manualModeState.isActive       = true;
    manualModeState.attackStartTime = Date.now();
    manualModeState.elapsedTime    = 0;
    manualModeState.failedRequests = 0;
    manualModeState.revenueLoss    = 0;
    manualModeState.attackedNodeId = nodeId;
    failedRequestsCount = 0;
  }

  broadcastToAll({ type: 'attack_start', data: { nodeId, attackType, intensity } });
  res.json({ success: true });
});

// Stop attack
app.post('/api/attack/stop', (req, res) => {
  console.log('⏹ Stop load/attack requested');
  loadGenerator.stop();
  activeNodes.forEach(n => n.endAttack());
  broadcastToAll({ type: 'attack_end', data: { nodeId: loadGenerator.targetNodeId } });
  res.json({ success: true });
});

// Normal traffic through the router (baseline demo — shows weight distribution)
// intensity: 5-20 RPS recommended, routes via :5100/:4000
app.post('/api/traffic/normal', (req, res) => {
  const intensity = Math.min(req.body.intensity || 10, 25); // cap at 25 RPS for safety
  const routerPort = activeEnvironment === 'EXTERNAL' ? 5100 : 4000;
  loadGenerator.start(intensity, null, routerPort);
  console.log(`🌐 Normal traffic: ${intensity} req/s → router :${routerPort} [${activeEnvironment}]`);
  broadcastToAll({ type: 'attack_start', data: { nodeId: null, attackType: 'NormalTraffic', intensity, router: routerPort } });
  res.json({ success: true, routerPort, intensity });
});

// Manual reroute
app.post('/api/reroute/manual', (req, res) => {
  const { fromNodeId, toNodeId } = req.body;
  const fromNode = activeNodes.find(n => n.nodeId === parseInt(fromNodeId));
  const toNode   = activeNodes.find(n => n.nodeId === parseInt(toNodeId));
  if (!fromNode || !toNode) return res.status(400).json({ error: 'Invalid nodes' });

  const shiftAmount   = 40;
  const oldFromWeight = fromNode.metrics.traffic;
  const oldToWeight   = toNode.metrics.traffic;

  if (activeIncidentDetails) {
    activeIncidentDetails.targetNodeId  = toNode.nodeId;
    activeIncidentDetails.decisionTimeMs = Math.round(manualModeState.elapsedTime * 1000);
  }

  manualModeState.completedSession = {
    reactionTime:  manualModeState.elapsedTime,
    failedRequests: manualModeState.failedRequests,
    revenueLoss:   manualModeState.revenueLoss,
    peakLatency:   fromNode.metrics.latency,
    peakRps:       fromNode.metrics.requestsPerSecond,
    fromNodeId:    parseInt(fromNodeId), toNodeId: parseInt(toNodeId),
    trafficBefore: { from: oldFromWeight, to: oldToWeight },
    trafficAfter:  { from: fromNode.metrics.traffic + shiftAmount, to: toNode.metrics.traffic - shiftAmount },
    completedAt:   Date.now(),
  };

  shiftTrafficWeights(fromNode, toNode, shiftAmount);
  console.log(`\n👤 MANUAL REROUTE EXECUTED: ${fromNode.name} → ${toNode.name}`);
  manualModeState.isActive = false;

  if (incident.state === 'ACTION_PENDING' || incident.nodeId === fromNode.nodeId) {
    incident.state            = 'VERIFYING';
    incident.verificationCount = 0;
    incident.targetNodeId     = toNode.nodeId;
  }

  eventStore.addEvent('REROUTE', fromNodeId,
    `👤 Manual reroute executed — ${fromNode.name} → ${toNode.name} | ` +
    `Reaction time: ${manualModeState.elapsedTime.toFixed(1)}s | Failed requests: ${manualModeState.failedRequests}`,
    'HIGH', { fromNodeId, toNodeId, reactionTime: manualModeState.elapsedTime,
      failedRequests: manualModeState.failedRequests, revenueLoss: manualModeState.revenueLoss });
  broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });

  eventStore.addEvent('INFO', toNodeId,
    `↗ Traffic weights updated — ${fromNode.name}: ${oldFromWeight}% → ${fromNode.metrics.traffic}% | ` +
    `${toNode.name}: ${oldToWeight}% → ${toNode.metrics.traffic}%`, 'MEDIUM');
  broadcastToAll({ type: 'event', data: eventStore.getAllEvents()[0] });
  broadcastToAll({ type: 'reroute', data: { fromNodeId, toNodeId, manual: true } });

  // Human Reroute: Weights shifted. Traffic generator continues running.
  // Degraded node naturally recovers due to reduced traffic allocation.
  if (incident.state === 'ACTION_PENDING' || incident.nodeId === fromNode.nodeId) {
    incident.state            = 'VERIFYING';
    incident.verificationCount = 0;
    incident.targetNodeId     = toNode.nodeId;
  }

  res.json({
    success: true,
    reactionTime: manualModeState.elapsedTime,
    failedRequests: manualModeState.failedRequests,
    revenueLoss: manualModeState.revenueLoss,
    fromNode: { nodeId: fromNode.nodeId, name: fromNode.name, trafficBefore: oldFromWeight, trafficAfter: fromNode.metrics.traffic },
    toNode:   { nodeId: toNode.nodeId,   name: toNode.name,   trafficBefore: oldToWeight,   trafficAfter: toNode.metrics.traffic },
  });
});

// Reset (environment-aware — resets within the current environment only)
app.post('/api/reset', (req, res) => {
  console.log('↺ Resetting demo state...');
  loadGenerator.stop();

  activeNodes.forEach(n => {
    n.endAttack();
    n.metrics.traffic = n.baseTraffic;
  });

  manualModeState = {
    isActive: false, attackStartTime: null, elapsedTime: 0,
    failedRequests: 0, revenueLoss: 0, attackedNodeId: null,
  };

  lastAIDecision      = null;
  activePlaybook      = null;
  failedRequestsCount = 0;
  lastRerouteTime     = 0;
  rerouteGeneration++;

  stats = {
    attacksDetected: 0, attacksBlocked: 0,
    avgResponseTime: null, totalAIResponseMs: 0,
    predictions: { total: 0, correct: 0, falsePositives: 0 },
  };

  activeIncidentDetails = null;
  lastIncidentReport    = null;

  incident = {
    state: 'NORMAL', nodeId: null, targetNodeId: null,
    detectedLatency: 0, predictedBreach: null, cooldownExpiry: 0, verificationCount: 0,
  };

  eventStore.clear();
  eventStore.addEvent('INFO', null, '🚀 NeuralFlow Orchestrator Reset - System Healthy', 'LOW');

  broadcastToAll({ type: 'demo_reset',    data: {} });
  broadcastState();
  broadcastToAll({ type: 'event_history', data: eventStore.getAllEvents() });

  res.json({ success: true });
});

app.post('/api/model/retrain', async (req, res) => {
  eventStore.addEvent('INFO', null, 'Starting model retraining...', 'LOW');
  await neuralAgent.trainModel(req.body.samples || 500, 2000);
  eventStore.addEvent('INFO', null, `Model retrained - Accuracy: ${neuralAgent.accuracy.toFixed(1)}%`, 'LOW');
  broadcastToAll({ type: 'model_retrained', data: neuralAgent.getPerformanceMetrics() });
  res.json({ success: true, performance: neuralAgent.getPerformanceMetrics() });
});

app.get('/api/model/export', (req, res) => {
  res.json({ success: true, model: neuralAgent.exportModel() });
});

app.get('/api/stats', (req, res) => {
  res.json({ success: true, stats, events: eventStore.getStatistics(), model: neuralAgent.getPerformanceMetrics() });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true, status: 'running', environment: activeEnvironment,
    model: neuralAgent.isTrained ? 'trained' : 'training',
    nodes: activeNodes.length,
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 NeuralFlow Backend Server running on http://localhost:${PORT}`);
});
