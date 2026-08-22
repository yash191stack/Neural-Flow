// Centralized API/WS configuration
// Defaults to localhost for hackathon development.
// Override via VITE_API_URL / VITE_WS_URL environment variables.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_URL  = import.meta.env.VITE_WS_URL  || 'ws://localhost:3001';
