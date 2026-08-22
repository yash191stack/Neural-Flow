// ConnectionBeams.jsx - Glowing connection beams between nodes
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ConnectionBeams({ nodes, positions }) {
  if (nodes.length < 2) return null;

  const connections = [
    { from: 1, to: 2 }, // US to EU
    { from: 2, to: 3 }, // EU to Asia
    { from: 1, to: 3 }  // US to Asia
  ];

  return (
    <group>
      {connections.map((conn, index) => {
        const fromNode = nodes.find(n => n.nodeId === conn.from);
        const toNode = nodes.find(n => n.nodeId === conn.to);
        
        if (!fromNode || !toNode) return null;

        return (
          <ConnectionBeam
            key={`${conn.from}-${conn.to}`}
            from={positions[conn.from]}
            to={positions[conn.to]}
            fromNode={fromNode}
            toNode={toNode}
            index={index}
          />
        );
      })}
    </group>
  );
}

function ConnectionBeam({ from, to, fromNode, toNode, index }) {
  const tubeRef = useRef();
  const flowRef = useRef();

  // Determine beam color based on node status
  const getBeamColor = () => {
    if (fromNode.isUnderAttack || toNode.isUnderAttack) return '#ff3366';
    if (fromNode.status === 'WARNING' || toNode.status === 'WARNING') return '#ffd700';
    return '#00ff88';
  };

  // Create curved path between nodes
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const midPoint = new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2 + 1, // Arc height
      (start.z + end.z) / 2
    );
    
    return new THREE.CatmullRomCurve3([start, midPoint, end]);
  }, [from, to]);

  const beamColor = getBeamColor();

  // Animate flow
  useFrame((state) => {
    if (flowRef.current) {
      flowRef.current.position.x = (Math.sin(state.clock.elapsedTime * 2 + index) + 1) * 0.5;
    }
  });

  // Generate points along curve for tube
  const points = useMemo(() => curve.getPoints(50), [curve]);

  return (
    <group>
      {/* Main beam tube */}
      <mesh ref={tubeRef}>
        <tubeGeometry args={[curve, 50, 0.03, 8, false]} />
        <meshBasicMaterial
          color={beamColor}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Glowing core */}
      <mesh>
        <tubeGeometry args={[curve, 50, 0.015, 8, false]} />
        <meshBasicMaterial
          color={beamColor}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Data packets moving along beam */}
      <DataPackets 
        curve={curve} 
        color={beamColor} 
        count={fromNode.isUnderAttack || toNode.isUnderAttack ? 8 : 3}
        speed={fromNode.isUnderAttack || toNode.isUnderAttack ? 2 : 1}
      />
    </group>
  );
}

function DataPackets({ curve, color, count, speed }) {
  const packetsRef = useRef([]);

  useFrame((state) => {
    packetsRef.current.forEach((packet, i) => {
      if (packet) {
        const t = ((state.clock.elapsedTime * speed + i / count) % 1);
        const point = curve.getPoint(t);
        packet.position.copy(point);
      }
    });
  });

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={el => packetsRef.current[i] = el}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </>
  );
}
