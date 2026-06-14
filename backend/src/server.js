import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { InfrastructureAgent } from './agent.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

const httpServer = createServer(app);

// Setup Socket.io with CORS allowed from frontend
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for dev development
    methods: ['GET', 'POST']
  }
});

// Callback when agent updates state
const handleAgentStateUpdate = (nodes, latestEvent) => {
  io.emit('state-update', {
    nodes,
    latestEvent,
    timestamp: new Date().toISOString()
  });
};

// Instantiate the agent
const agent = new InfrastructureAgent(handleAgentStateUpdate);
agent.start();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send initial data to client
  socket.emit('init-data', {
    nodes: agent.nodes,
    events: agent.getLogs()
  });

  // Handle manual anomaly injection from client
  socket.on('inject-spike', (data) => {
    const { nodeId } = data;
    console.log(`🚨 Manual trigger: Injection request for node ${nodeId}`);
    agent.triggerManualSpike(nodeId);
  });

  // Handle manual force re-route
  socket.on('force-reroute', (data) => {
    const { nodeId } = data;
    const node = agent.nodes.find(n => n.id === nodeId);
    if (node && node.status === 'DEGRADED') {
      console.log(`🤖 Manual trigger: Force re-routing for node ${node.name}`);
      node.status = 'RECONFIGURING';
      
      const event = agent.logEvent(
        'REROUTE',
        node.id,
        node.name,
        `Manual Orchestration Override: Force re-routing traffic for ${node.name}.`,
        { manualOverride: true }
      );
      
      io.emit('state-update', {
        nodes: agent.nodes,
        latestEvent: event,
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        agent.recoverNode(node.id);
      }, 3000);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Handle server shutdown gracefully
const shutdown = () => {
  console.log('\nStopping servers...');
  agent.stop();
  httpServer.close(() => {
    console.log('HTTP Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_PATH = path.join(__dirname, '../../frontend/dist');

// Serve static assets from frontend build if it exists
if (fs.existsSync(DIST_PATH)) {
  console.log(`📁 Serving static assets from: ${DIST_PATH}`);
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`🚀 NeuralFlow Orchestrator Server running on http://localhost:${PORT}`);
});
