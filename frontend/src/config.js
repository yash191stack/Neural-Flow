// Centralized API/WS configuration
// Defaults to localhost for hackathon development.
// Override via VITE_API_URL / VITE_WS_URL environment variables.
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

export const API_URL = import.meta.env.VITE_API_URL || 
  (isLocal ? 'http://localhost:3001' : (typeof window !== 'undefined' ? window.location.origin : ''));

export const WS_URL  = import.meta.env.VITE_WS_URL  || 
  (isLocal ? 'ws://localhost:3001' : (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : ''));

