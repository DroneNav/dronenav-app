
import React from 'react';
import * as THREE from 'three';

export default function DronePort3D({
  position,
  diameter,
  height,
}) {
  return (
    <mesh
      position={[
        position[0],
        position[1] + height / 2,
        position[2],
      ]}
    >
      <cylinderGeometry
        args={[diameter / 2, diameter / 2, height, 48]}
      />
      <meshStandardMaterial
        color="#00cc88"
        transparent
        opacity={0.2}
        depthWrite={false}
        side={THREE.DoubleSide}
      />

      {[-height / 2, height / 2].map((y) => (
        <lineLoop
          key={y}
          position={[0, y, 0]}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array(
                  Array.from({ length: 48 }, (_, i) => {
                    const angle = (i / 48) * Math.PI * 2;
                    return [
                      Math.cos(angle) * diameter / 2,
                      0,
                      Math.sin(angle) * diameter / 2,
                    ];
                  }).flat()
                ),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00cc88" />
        </lineLoop>
      ))}
    </mesh>
  );
}
