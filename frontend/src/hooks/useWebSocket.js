// WebSocket Hook - Auto-reconnecting WebSocket connection with message handling
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { WS_URL } from '../config';
const BASE_RECONNECT_DELAY = 3000;  // 3s initial
const MAX_RECONNECT_DELAY  = 30000; // 30s cap

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const {
    setNodes,
    setMode,
    setEnvironment,
    addEvent,
    setEvents,
    setManualModeState,
    setLastAIDecision,
    setLastIncidentReport,
    setActivePlaybook,
    setModelPerformance,
    setStats,
    setServerUptime,
    setAttackStats,
    setWsConnected,
    setIncident,
    resetTransientState,
    settings
  } = useStore();

  const handleMessage = (message) => {
    const { type, data } = message;

    switch (type) {
      case 'demo_reset':
        // Proactively clear all transient incident state immediately,
        // before the follow-up 'state' broadcast arrives.
        resetTransientState();
        break;

      case 'environment_changed':
        // Backend switched environment (INTERNAL ↔ EXTERNAL).
        // Transient state is already cleared server-side; mirror it here.
        if (data.environment) setEnvironment(data.environment);
        resetTransientState();
        if (settings.notifications) {
          toast(data.environment === 'EXTERNAL'
            ? '🌐 Switched to BharatBazaar (External)'
            : '🖥 Switched to Internal Demo', { duration: 3000 });
        }
        break;

      case 'state':
        // Full state update from backend broadcast
        if (data.nodes) setNodes(data.nodes);
        if (data.mode) setMode(data.mode);
        if (data.environment) setEnvironment(data.environment);
        if (data.manualModeState) setManualModeState(data.manualModeState);
        // Always propagate lastAIDecision — including null (reset clears it)
        if (data.lastAIDecision !== undefined) setLastAIDecision(data.lastAIDecision);
        if (data.lastIncidentReport !== undefined) setLastIncidentReport(data.lastIncidentReport);
        // Always propagate activePlaybook — including null
        if (data.activePlaybook !== undefined) setActivePlaybook(data.activePlaybook);
        if (data.modelPerformance) setModelPerformance(data.modelPerformance);
        if (data.stats) setStats(data.stats);
        if (data.serverUptime) setServerUptime(data.serverUptime);
        if (data.attackStats) setAttackStats(data.attackStats);
        if (data.incident) setIncident(data.incident);
        break;

      case 'event_history':
        // Load all past events
        console.log(`📚 Loaded ${data.length} events from history`);
        setEvents(data);
        break;

      case 'event':
        // New single event
        addEvent(data);
        
        // Show toast notification for important events
        if (settings.notifications) {
          if (data.type === 'ALERT' && data.severity === 'CRITICAL') {
            toast.error(data.message, {
              icon: '🚨',
              duration: 4000
            });
          } else if (data.type === 'AI_DECISION') {
            toast.success(data.message, {
              icon: '🤖',
              duration: 3000
            });
          } else if (data.type === 'RECOVERY') {
            toast.success(data.message, {
              icon: '✅',
              duration: 3000
            });
          }
        }
        break;

      case 'ai_decision':
        setLastAIDecision(data);
        if (settings.notifications) {
          toast.success(`AI rerouted traffic in ${data.responseTimeMs}ms`, {
            icon: '🤖',
            duration: 3000
          });
        }
        break;

      case 'playbook_started':
        setActivePlaybook(data);
        break;

      case 'model_trained':
      case 'model_retrained':
        setModelPerformance(data);
        if (settings.notifications) {
          toast.success(`Neural network trained - ${data.accuracy.toFixed(1)}% accuracy`, {
            icon: '🧠',
            duration: 4000
          });
        }
        break;

      case 'model_status':
        setModelPerformance(data);
        break;

      case 'mode_changed':
        setMode(data.mode);
        if (settings.notifications) {
          toast(`Mode switched to ${data.mode}`, {
            icon: data.mode === 'AI' ? '🤖' : '👤',
            duration: 2000
          });
        }
        break;

      case 'attack_start':
        if (settings.notifications) {
          toast.error(`Attack launched on Node ${data.nodeId}`, {
            icon: '🚨',
            duration: 3000
          });
        }
        break;

      case 'attack_end':
        if (settings.notifications) {
          toast.success(`Attack on Node ${data.nodeId} subsided`, {
            icon: '✅',
            duration: 3000
          });
        }
        break;

      case 'reroute':
        if (data.manual && settings.notifications) {
          toast(`Manual reroute: Node ${data.fromNodeId} → Node ${data.toNodeId}`, {
            icon: '👤',
            duration: 3000
          });
        }
        break;

      default:
        console.log('Unknown message type:', type);
    }
  };

  const connect = () => {
    // Don't connect if component unmounted or already connecting
    if (isUnmountedRef.current || isConnectingRef.current) {
      return;
    }

    // Check if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection if it's in CONNECTING state
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectingRef.current = true;

    try {
      console.log(`🔄 Connecting to WebSocket... (attempt ${reconnectAttemptsRef.current + 1})`);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection
        
        if (settings.notifications) {
          toast.success('Connected to NeuralFlow V3 server', {
            icon: '🔌',
            duration: 2000
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected', event.code, event.reason);
        setWsConnected(false);
        isConnectingRef.current = false;
        wsRef.current = null;

        // Don't reconnect if component unmounted
        if (isUnmountedRef.current) {
          return;
        }

        // Exponential backoff — no hard cap on attempts; retries until backend returns
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current - 1),
          MAX_RECONNECT_DELAY
        );

        console.log(`🔄 Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current})...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  };

  const disconnect = () => {
    isUnmountedRef.current = true; // Mark as unmounted
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  };

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  };

  useEffect(() => {
    isUnmountedRef.current = false; // Reset on mount
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    reconnect: connect
  };
}

export default useWebSocket;
