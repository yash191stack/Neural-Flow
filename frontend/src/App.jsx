import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import ControlRoom from './components/ControlRoom';
import LogSidebar from './components/LogSidebar';
import { WifiOff, Radio } from 'lucide-react';

const SOCKET_URL = 'http://localhost:3001';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [events, setEvents] = useState([]);
  
  // Hackathon Wow-Factor features
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [chaosActive, setChaosActive] = useState(false);
  const [autoPilot, setAutoPilot] = useState(true);
  const [latencyHistory, setLatencyHistory] = useState(Array(20).fill(65));

  const voiceRef = useRef(voiceEnabled);
  const chaosRef = useRef(chaosActive);
  const nodesRef = useRef(nodes);

  // Sync state refs to prevent stale closure inside socket event listeners
  useEffect(() => { voiceRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { chaosRef.current = chaosActive; }, [chaosActive]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Voice synthesizer synthesizer
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Simplify message for nicer robotic vocalization
      let speechMsg = text
        .replace('Autonomous Orchestrator:', 'Agent action.')
        .replace('Manual Orchestration Override:', 'Manual override.');
        
      const utterance = new SpeechSynthesisUtterance(speechMsg);
      utterance.rate = 1.1; // Robotic tempo
      utterance.pitch = 0.9; // Sub-bass synth depth
      
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name.includes('Google') || v.name.includes('Robot') || v.name.includes('Male')) || voices[0];
      if (voice) utterance.voice = voice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const socketClient = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketClient.on('connect', () => {
      console.log('⚡ Connected to NeuralFlow Backend Server');
      setConnected(true);
    });

    socketClient.on('disconnect', () => {
      console.log('🔌 Disconnected from NeuralFlow Backend Server');
      setConnected(false);
    });

    socketClient.on('init-data', (data) => {
      setNodes(data.nodes);
      setEvents(data.events || []);
      
      // Seed initial history
      const initialAvg = Math.round(data.nodes.reduce((sum, n) => sum + n.latency, 0) / data.nodes.length);
      setLatencyHistory(Array(20).fill(initialAvg));
    });

    socketClient.on('state-update', (data) => {
      setNodes(data.nodes);
      
      // Record latency average in sliding history
      const avg = Math.round(data.nodes.reduce((sum, n) => sum + n.latency, 0) / data.nodes.length);
      setLatencyHistory((prev) => [...prev.slice(1), avg]);

      if (data.latestEvent) {
        setEvents((prev) => {
          const filtered = prev.filter(e => e.id !== data.latestEvent.id);
          return [data.latestEvent, ...filtered].slice(0, 100);
        });

        // Trigger AI Voice Synthesizer
        if (voiceRef.current) {
          speakText(data.latestEvent.message);
        }
      }
    });

    setSocket(socketClient);

    // Load voices early
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    return () => {
      socketClient.disconnect();
    };
  }, []);

  // Chaos Engine timer loop
  useEffect(() => {
    if (!chaosActive) return;

    const interval = setInterval(() => {
      // Pick a random node that is currently OPTIMAL to inject anomaly
      const optimalNodes = nodesRef.current.filter(n => n.status === 'OPTIMAL');
      if (optimalNodes.length > 0) {
        const randomNode = optimalNodes[Math.floor(Math.random() * optimalNodes.length)];
        handleInjectSpike(randomNode.id);
      }
    }, 6500);

    return () => clearInterval(interval);
  }, [chaosActive]);

  const handleInjectSpike = (nodeId) => {
    if (socket && connected) {
      socket.emit('inject-spike', { nodeId });
    }
  };

  const handleForceReroute = (nodeId) => {
    if (socket && connected) {
      socket.emit('force-reroute', { nodeId });
    }
  };

  return (
    <div className="h-screen w-screen flex flex-row overflow-hidden bg-dark-bg text-slate-200">
      
      {/* Main Control HUD */}
      <ControlRoom
        nodes={nodes}
        events={events}
        latencyHistory={latencyHistory}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        chaosActive={chaosActive}
        setChaosActive={setChaosActive}
        autoPilot={autoPilot}
        setAutoPilot={setAutoPilot}
        onInjectSpike={handleInjectSpike}
        onForceReroute={handleForceReroute}
      />

      {/* Decision Engine Logs Sidebar */}
      <LogSidebar events={events} />

      {/* Offline Connection Screen Overlay */}
      {!connected && (
        <div className="absolute inset-0 bg-dark-bg/95 backdrop-blur-md flex flex-col items-center justify-center z-50 transition-all duration-500">
          <div className="p-8 rounded-xl glass-panel-neon border border-cyan-500/20 max-w-sm w-full mx-4 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-cyan-950/45 border border-cyan-500/30 rounded-full text-cyan-400 animate-pulse">
              <Radio className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-orbitron font-extrabold text-lg tracking-wider text-glow-blue text-cyan-400">
                NEURAL CORE OFFLINE
              </h2>
              <p className="font-mono text-[10px] text-slate-400 mt-2 leading-relaxed">
                Attempting connection to orchestration server on <span className="text-slate-200">{SOCKET_URL}</span>...
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Retry interval: 2000ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
