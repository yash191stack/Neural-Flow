import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  const sidebarW = sidebarOpen ? 240 : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(o => !o)} />

      <motion.main
        animate={{ marginLeft: window.innerWidth >= 1024 ? sidebarW : 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        style={{ minHeight: '100vh', paddingTop: 56 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </motion.main>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 500,
            boxShadow: 'var(--shadow-lg)',
            fontFamily: 'var(--font-ui)',
            maxWidth: '360px',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-elevated)' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--bg-elevated)' } },
        }}
      />

      {/* ambient bg orbs */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:-1 }}>
        <div style={{
          position:'absolute', top:'-20%', right:'-10%',
          width:700, height:700, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,212,255,0.035),transparent 65%)',
          filter:'blur(80px)',
        }} />
        <div style={{
          position:'absolute', bottom:'-20%', left:'-10%',
          width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(124,92,252,0.025),transparent 65%)',
          filter:'blur(80px)',
        }} />
      </div>
    </div>
  );
}
