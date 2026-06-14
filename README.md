# NeuralFlow: Closed-Loop Autonomous Network Orchestrator

NeuralFlow is an intelligent, self-healing network orchestration platform designed for distributed infrastructure. By combining a real-time background orchestration agent on the backend with a high-fidelity 3D command room visualization on the frontend, NeuralFlow demonstrates how autonomous control loops can dynamically detect, isolate, and reconfigure network nodes experiencing traffic congestion.

---

## Key Capabilities

1. **Closed-Loop Agentic Control**: A background daemon monitors telemetry from globally distributed infrastructure nodes. If node latency crosses a **300ms** threshold, the decision engine autonomously triggers a `RerouteEvent`, flags the node state as `RECONFIGURING`, reroutes traffic, writes audit trails to disk, and restores optimal parameters within 3 seconds.
2. **Dynamic Chaos Engineering**: A built-in Chaos Module allows operators to inject synthetic latency spikes on individual nodes or activate the **Chaos Autopilot** to test network resilience and self-healing convergence times.
3. **Interactive 3D Topology**: Built with React Three Fiber (R3F), featuring glowing physical material orbs, rotating diagnostic torus rings, dynamic connection links, and animated packet flows representing real-time traffic volume.
4. **Cinematic Camera Rig**: An automated camera rig mode that orbits and pans through the 3D space, facilitating continuous telemetry monitoring from various perspectives.
5. **Auditory Telemetry Alerts**: Integrates with the browser's native `SpeechSynthesis` API to provide voice alerts for reroute and recovery events.
6. **Live Analytics Waveforms**: Real-time visualization of average network latency trends using lightweight SVG curve graphs.

---

## Technical Stack

* **Backend**: Node.js, Express, Socket.io (Real-time WebSockets), Node FileSystem
* **Frontend**: React.js, Vite, Tailwind CSS v4, React Three Fiber (Three.js), GSAP, Framer Motion, Lucide Icons

---

## Directory Structure

```
.
├── backend/
│   ├── src/
│   │   ├── agent.js        # InfrastructureAgent class (Decision Heuristics & Simulation)
│   │   └── server.js       # Express + Socket.io Server (WebSocket Interface)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ControlRoom.jsx   # Telemetry HUD (Controls, Chaos, SVG Waveform)
│   │   │   ├── NetworkMesh.jsx   # 3D R3F Canvas (Orbs, Lines, Particles, Starfield)
│   │   │   └── LogSidebar.jsx    # Glassmorphism terminal log (Framer Motion transitions)
│   │   ├── App.jsx               # WebSocket bindings & Speech Synthesis hooks
│   │   ├── index.css             # Tailwind v4 directives & custom styling
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Setup & Deployment Instructions

### Prerequisites
Ensure [Node.js](https://nodejs.org/) (v18 or higher) is installed.

---

### Step 1: Start the Backend Orchestration Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the server:
   ```bash
   npm start
   ```
   *The server will initialize the `InfrastructureAgent` loop and listen on port `3001`.*

---

### Step 2: Start the Frontend Control Console

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development console:
   ```bash
   npm run dev
   ```
4. Access the console via [http://localhost:5174/](http://localhost:5174/) in your browser.

---

## Agent Logic & Self-Healing Loop

The orchestration agent monitors metrics on each tick. The decision logic is implemented as follows:

```javascript
// From backend/src/agent.js
monitorAndOrchestrate() {
  // 1. Analyze node state metrics
  this.nodes.forEach(node => {
    // 2. Identify Congestion Anomalies (>300ms latency threshold)
    if (node.latency > 300 && node.status === 'DEGRADED') {
      node.status = 'RECONFIGURING';
      
      // 3. Log a RerouteEvent and emit details via Socket.io
      this.logEvent('REROUTE', node.id, node.name, `Autonomous Orchestrator: Bypassing node.`);
      
      // 4. Schedule automatic recovery self-healing
      setTimeout(() => {
        this.recoverNode(node.id);
      }, 3000);
    }
  });
}
```
This loop ensures the orchestrator dynamically adjusts routes to isolate bottlenecks without operator intervention.
