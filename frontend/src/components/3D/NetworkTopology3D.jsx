// NetworkTopology3D.jsx - Main 3D scene with React Three Fiber
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import ServerNode3D from './ServerNode3D';
import ConnectionBeams from './ConnectionBeams';
import DataParticles from './DataParticles';
import AttackRings from './AttackRings';
import useStore from '../../store/useStore';

export default function NetworkTopology3D() {
  const nodes = useStore(state => state.nodes);

  // Node positions in 3D space
  const nodePositions = {
    1: [-3, 0, 0],   // US Server - Left
    2: [0, 1.5, 0],  // EU Server - Top
    3: [3, 0, 0]     // Asia Server - Right
  };

  return (
    <div className="w-full h-[600px] bg-neural-bg rounded-xl border border-neural-border overflow-hidden">
      <Canvas
        camera={{ position: [0, 3, 8], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Background stars */}
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={1}
        />

        {/* Environment lighting */}
        <Environment preset="night" />

        {/* Render server nodes */}
        {nodes.map(node => (
          <ServerNode3D
            key={node.nodeId}
            node={node}
            position={nodePositions[node.nodeId]}
          />
        ))}

        {/* Connection beams between nodes */}
        <ConnectionBeams nodes={nodes} positions={nodePositions} />

        {/* Animated data particles */}
        <DataParticles nodes={nodes} positions={nodePositions} />

        {/* Attack rings for nodes under attack */}
        {nodes
          .filter(node => node.isUnderAttack)
          .map(node => (
            <AttackRings
              key={`attack-${node.nodeId}`}
              position={nodePositions[node.nodeId]}
              attackType={node.attackType}
            />
          ))}

        {/* Camera controls */}
        <OrbitControls
          enablePan={false}
          maxDistance={15}
          minDistance={4}
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            intensity={1.5}
            radius={0.4}
          />
        </EffectComposer>
      </Canvas>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 bg-neural-card/90 backdrop-blur-sm border border-neural-border rounded-lg p-3 text-xs">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neural-glow shadow-glow-green" />
            <span className="text-gray-300">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neural-yellow shadow-glow-yellow" />
            <span className="text-gray-300">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neural-red shadow-glow-red" />
            <span className="text-gray-300">Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
}
