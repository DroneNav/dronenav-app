
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
      <lineSegments>
        <edgesGeometry
          args={[
            new THREE.CylinderGeometry(
              diameter / 2,
              diameter / 2,
              height,
              48
            ),
          ]}
        />
        <lineBasicMaterial color="#00cc88" />
      </lineSegments>
    </mesh>
  );
}
