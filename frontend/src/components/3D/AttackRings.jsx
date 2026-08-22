// AttackRings.jsx - Expanding pulse rings during attacks
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function AttackRings({ position, attackType }) {
  const [rings, setRings] = useState([]);
  const nextRingTime = useRef(0);

  // Create new rings periodically
  useFrame((state) => {
    if (state.clock.elapsedTime > nextRingTime.current) {
      setRings(prev => [...prev, {
        id: Math.random(),
        startTime: state.clock.elapsedTime,
        duration: 2 // seconds
      }]);
      nextRingTime.current = state.clock.elapsedTime + 0.5; // New ring every 0.5s

      // Limit number of rings
      if (rings.length > 4) {
        setRings(prev => prev.slice(1));
      }
    }
  });

  // Remove expired rings
  useEffect(() => {
    const interval = setInterval(() => {
      setRings(prev => prev.filter(ring => {
        // Keep rings that are less than 2 seconds old
        return Date.now() - ring.startTime < 2000;
      }));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <group position={position}>
      {rings.map(ring => (
        <AttackRing key={ring.id} ring={ring} attackType={attackType} />
      ))}
    </group>
  );
}

function AttackRing({ ring, attackType }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const elapsed = state.clock.elapsedTime - ring.startTime;
      const progress = Math.min(elapsed / ring.duration, 1);

      // Expand
      const scale = 1 + progress * 4;
      meshRef.current.scale.set(scale, scale, scale);

      // Fade out
      meshRef.current.material.opacity = 1 - progress;
    }
  });

  // Color based on attack type
  const getAttackColor = () => {
    switch (attackType) {
      case 'DDoS': return '#ff3366';
      case 'SlowLoris': return '#ff6b35';
      case 'MemoryLeak': return '#a855f7';
      case 'TrafficSpike': return '#ffd700';
      default: return '#ff3366';
    }
  };

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.0, 32]} />
      <meshBasicMaterial
        color={getAttackColor()}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
