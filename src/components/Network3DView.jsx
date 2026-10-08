import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function Network3DView() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas camera={{ position: [60, 60, 60], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[20, 40, 20]} intensity={1.2} />

        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[30, 20, 30]} />
          <meshStandardMaterial color="#3399cc" wireframe />
        </mesh>

        <gridHelper args={[200, 20]} />
        <axesHelper args={[30]} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}