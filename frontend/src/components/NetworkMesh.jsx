import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Stars } from '@react-three/drei';
import * as THREE from 'three';

// 3D coordinates for our 5 nodes
const NODE_POSITIONS = {
  n1: new THREE.Vector3(0, 2, 0),         // Top
  n2: new THREE.Vector3(2.2, 0.7, 1.2),    // Top-Right
  n3: new THREE.Vector3(1.4, -1.8, -1.0),  // Bottom-Right
  n4: new THREE.Vector3(-1.4, -1.8, 1.0),  // Bottom-Left
  n5: new THREE.Vector3(-2.2, 0.7, -1.2)   // Top-Left
};

// Node colors based on state
const STATUS_COLORS = {
  OPTIMAL: '#39ff14',      // Neon Green
  DEGRADED: '#ff0055',     // Neon Red
  RECONFIGURING: '#ff9f00' // Neon Orange
};

function NodeOrb({ id, name, latency, load, status, position, onSelect }) {
  const orbRef = useRef();
  const ringRef = useRef();
  const outerRingRef = useRef();

  // Simple rotation and scaling animation via useFrame
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (orbRef.current) {
      // Gentle floating animation
      orbRef.current.position.y = position.y + Math.sin(time * 2 + id.charCodeAt(1)) * 0.08;
      
      // Anomaly shake effect if DEGRADED
      if (status === 'DEGRADED') {
        orbRef.current.position.x = position.x + (Math.random() - 0.5) * 0.05;
        orbRef.current.position.z = position.z + (Math.random() - 0.5) * 0.05;
      } else {
        orbRef.current.position.x = position.x;
        orbRef.current.position.z = position.z;
      }
    }

    // Spin outer diagnostic rings
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.5;
      ringRef.current.rotation.x = time * 0.2;
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = -time * 0.8;
    }
  });

  const color = STATUS_COLORS[status] || STATUS_COLORS.OPTIMAL;

  return (
    <group ref={orbRef}>
      {/* Central Glowing Orb */}
      <mesh onClick={() => onSelect({ id, name, latency, load, status })}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={status === 'OPTIMAL' ? 1.5 : 2.5}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={0.3}
          thickness={0.5}
        />
      </mesh>

      {/* Point Light inside the Orb */}
      <pointLight 
        color={color} 
        intensity={status === 'OPTIMAL' ? 4 : 8} 
        distance={5} 
        decay={2} 
      />

      {/* Inner Diagnostic Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.5, 0.015, 8, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={status === 'OPTIMAL' ? 0.3 : 0.7} 
        />
      </mesh>

      {/* Outer Rotating Reconfiguration Ring (visible/faster during reconfiguration) */}
      {(status === 'RECONFIGURING' || status === 'DEGRADED') && (
        <mesh ref={outerRingRef}>
          <torusGeometry args={[0.65, 0.01, 4, 32]} />
          <meshBasicMaterial 
            color={status === 'RECONFIGURING' ? '#ff9f00' : '#ff0055'} 
            transparent 
            opacity={0.8}
            wireframe
          />
        </mesh>
      )}

      {/* 3D HTML telemetry tag overlay */}
      <Html distanceFactor={6} position={[0, 0.7, 0]} center>
        <div className={`px-2 py-1 rounded border font-mono text-[10px] whitespace-nowrap transition-all duration-300 pointer-events-none select-none
          ${status === 'DEGRADED' ? 'bg-red-950/80 border-red-500/50 text-red-400 text-glow-red' : 
            status === 'RECONFIGURING' ? 'bg-orange-950/80 border-orange-500/50 text-orange-400 text-glow-orange' : 
            'bg-slate-950/75 border-emerald-500/30 text-emerald-400 text-glow-green'}`}>
          <div className="font-bold flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse
              ${status === 'DEGRADED' ? 'bg-red-500' : status === 'RECONFIGURING' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
            {name}
          </div>
          <div>LTC: {latency}ms</div>
          <div>LOD: {load}%</div>
        </div>
      </Html>
    </group>
  );
}

// Draw connection line between two nodes
function Connection({ start, end, startStatus, endStatus }) {
  const isCongested = startStatus === 'DEGRADED' || endStatus === 'DEGRADED';
  const isReconfiguring = startStatus === 'RECONFIGURING' || endStatus === 'RECONFIGURING';
  
  let color = 'rgba(0, 240, 255, 0.25)'; // Neon blue baseline
  let width = 1.2;

  if (isCongested) {
    color = '#ff0055'; // Neon red
    width = 2.5;
  } else if (isReconfiguring) {
    color = '#ff9f00'; // Neon orange pulse
    width = 1.8;
  }

  // Draw simple line
  return (
    <Line
      points={[NODE_POSITIONS[start], NODE_POSITIONS[end]]}
      color={color}
      lineWidth={width}
      transparent
      opacity={isCongested ? 0.9 : isReconfiguring ? 0.7 : 0.3}
    />
  );
}

// Simulated data packet traveling between nodes
function DataPacket({ start, end, speed, isCongested }) {
  const meshRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Calculate progress as a function of time and speed
    // If congested, packets stutter or freeze
    const factor = isCongested 
      ? (time * speed * 0.3) % 1.0 
      : (time * speed) % 1.0;
      
    if (meshRef.current) {
      const pStart = NODE_POSITIONS[start];
      const pEnd = NODE_POSITIONS[end];
      meshRef.current.position.lerpVectors(pStart, pEnd, factor);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial 
        color={isCongested ? '#ff0055' : '#00f0ff'} 
        transparent 
        opacity={0.8} 
      />
    </mesh>
  );
}

// Camera Auto-Centering / Subtle Movement
function SceneRig({ autoPilot }) {
  const { camera } = useThree();
  useFrame((state) => {
    if (!autoPilot) return;
    const time = state.clock.getElapsedTime();
    // Smooth cinematic camera orbit and height sweeps
    camera.position.x = 6.5 * Math.sin(time * 0.15);
    camera.position.z = 6.5 * Math.cos(time * 0.15);
    camera.position.y = 2.5 + Math.sin(time * 0.3) * 1.5;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function NetworkMesh({ nodes, onSelectNode, autoPilot }) {
  // Define active routes for fully connected topology
  const routes = useMemo(() => {
    const keys = Object.keys(NODE_POSITIONS);
    const list = [];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        list.push({ start: keys[i], end: keys[j] });
      }
    }
    return list;
  }, []);

  // Map backend node states into positions
  const nodesMap = useMemo(() => {
    return nodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});
  }, [nodes]);

  return (
    <div className="w-full h-full relative cyber-grid">
      <Canvas
        camera={{ position: [0, 4, 7], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        
        {/* Neon dust background star field */}
        <Stars radius={90} depth={40} count={3500} factor={4} saturation={0.5} fade speed={1.2} />

        {/* Draw Connection Links */}
        {routes.map((route, idx) => {
          const startNode = nodesMap[route.start] || {};
          const endNode = nodesMap[route.end] || {};
          return (
            <Connection
              key={`c-${idx}`}
              start={route.start}
              end={route.end}
              startStatus={startNode.status}
              endStatus={endNode.status}
            />
          );
        })}

        {/* Draw Animating Packets */}
        {routes.map((route, idx) => {
          const startNode = nodesMap[route.start] || {};
          const endNode = nodesMap[route.end] || {};
          const isCongested = startNode.status === 'DEGRADED' || endNode.status === 'DEGRADED';
          
          // Seed speeds differently
          const speed = 0.3 + (idx % 3) * 0.15;

          return (
            <DataPacket
              key={`p-${idx}`}
              start={route.start}
              end={route.end}
              speed={speed}
              isCongested={isCongested}
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => (
          <NodeOrb
            key={node.id}
            id={node.id}
            name={node.name}
            latency={node.latency}
            load={node.load}
            status={node.status}
            position={NODE_POSITIONS[node.id]}
            onSelect={onSelectNode}
          />
        ))}

        <OrbitControls 
          enableZoom={true} 
          maxDistance={12} 
          minDistance={3}
          enablePan={false}
          autoRotate={!autoPilot}
          autoRotateSpeed={0.3}
        />
        <SceneRig autoPilot={autoPilot} />
      </Canvas>

      {/* Control Room Watermark Overlay */}
      <div className="absolute top-4 left-4 font-orbitron text-[10px] text-slate-500 tracking-[0.2em] uppercase select-none pointer-events-none">
        Telemetry Stream: 3D_Topology_Mesh v2.4
      </div>
    </div>
  );
}
