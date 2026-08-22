// ServerNode3D.jsx - Individual 3D server node with health visualization
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';

export default function ServerNode3D({ node, position }) {
  const sphereRef = useRef();
  const ringRefs = useRef([]);
  
  // Determine color based on status
  const getNodeColor = () => {
    if (node.isUnderAttack) return '#ff3366';
    if (node.status === 'HEALTHY') return '#00ff88';
    if (node.status === 'WARNING') return '#ffd700';
    if (node.status === 'CRITICAL') return '#ff3366';
    return '#00ff88';
  };

  const getEmissiveColor = () => {
    if (node.isUnderAttack) return '#330011';
    if (node.status === 'HEALTHY') return '#003322';
    if (node.status === 'WARNING') return '#332200';
    if (node.status === 'CRITICAL') return '#330011';
    return '#003322';
  };

  const nodeColor = getNodeColor();
  const emissiveColor = getEmissiveColor();

  // Breathing animation
  useFrame((state) => {
    if (sphereRef.current) {
      const breathe = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1;
      sphereRef.current.scale.set(breathe, breathe, breathe);
    }

    // Rotate rings at different speeds
    ringRefs.current.forEach((ring, index) => {
      if (ring) {
        ring.rotation.z += (0.005 + index * 0.002) * (node.isUnderAttack ? 3 : 1);
        ring.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      }
    });
  });

  // Create orbital particles based on health
  const particleCount = Math.floor((node.health / 100) * 20);
  const particles = useMemo(() => {
    const positions = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.5;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: (Math.random() - 0.5) * 0.5
      });
    }
    return positions;
  }, [particleCount]);

  return (
    <group position={position}>
      {/* Main sphere */}
      <Sphere ref={sphereRef} args={[0.8, 32, 32]} castShadow>
        <meshStandardMaterial
          color={nodeColor}
          emissive={emissiveColor}
          emissiveIntensity={node.isUnderAttack ? 0.8 : 0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>

      {/* Concentric rings */}
      {[1.2, 1.5, 1.8].map((radius, index) => (
        <mesh
          key={index}
          ref={el => ringRefs.current[index] = el}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[radius, 0.02, 8, 32]} />
          <meshBasicMaterial
            color={nodeColor}
            transparent
            opacity={0.3 - index * 0.08}
          />
        </mesh>
      ))}

      {/* Health orbit particles */}
      {particles.map((pos, i) => (
        <Particle
          key={i}
          position={[pos.x, pos.y, pos.z]}
          color={nodeColor}
          speed={0.5 + i * 0.1}
        />
      ))}

      {/* Node label */}
      <Html
        position={[0, 1.5, 0]}
        center
        distanceFactor={8}
        className="pointer-events-none"
      >
        <div className="bg-neural-card/95 backdrop-blur-sm border border-neural-border rounded-lg px-3 py-2 text-xs whitespace-nowrap">
          <div className="font-semibold text-white">{node.name}</div>
          <div className="text-gray-400 text-[10px]">{node.location}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: nodeColor, boxShadow: `0 0 8px ${nodeColor}` }}
              />
              <span className="text-gray-300">{node.health}%</span>
            </div>
            <div className="text-gray-400">|</div>
            <span className="text-gray-300">{node.latency}ms</span>
          </div>
          {node.isUnderAttack && (
            <div className="text-neural-red font-mono text-[10px] mt-1 animate-pulse">
              ⚠ {node.attackType}
            </div>
          )}
        </div>
      </Html>

      {/* Additional spotlight when under attack */}
      {node.isUnderAttack && (
        <pointLight
          position={[0, 2, 0]}
          color="#ff3366"
          intensity={2}
          distance={5}
        />
      )}
    </group>
  );
}

// Small particle component for orbiting dots
function Particle({ position, color, speed }) {
  const ref = useRef();
  
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.elapsedTime * speed;
      ref.current.position.x = position[0] * Math.cos(time) - position[1] * Math.sin(time);
      ref.current.position.y = position[0] * Math.sin(time) + position[1] * Math.cos(time);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}
