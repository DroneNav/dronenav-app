
import React from 'react';
import * as THREE from 'three';

function RouteTunnel({ start, end, width = 30, height = 20 }) {
  const startPoint = new THREE.Vector3(...start);
  const endPoint = new THREE.Vector3(...end);

  const direction = new THREE.Vector3()
    .subVectors(endPoint, startPoint);

  const length = direction.length();

  const midpoint = new THREE.Vector3()
    .addVectors(startPoint, endPoint)
    .multiplyScalar(0.5);

  const angle = Math.atan2(direction.x, direction.z);

  return (
    <mesh
      position={[midpoint.x, midpoint.y + height / 2, midpoint.z]}
      rotation={[0, angle, 0]}
    >
      <boxGeometry args={[width, height, length]} />
      <meshStandardMaterial
        color="#3399cc"
        transparent
        opacity={0.2}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(width, height, length)]}
        />
        <lineBasicMaterial color="#0088ff" />
      </lineSegments>
    </mesh>
  );
}

function RouteJunction({ position, radius = 15, height = 20 }) {
  return (
    <mesh
      position={[
        position[0],
        position[1] + height / 2,
        position[2],
      ]}
    >
      <cylinderGeometry args={[radius, radius, height, 48]} />
      <meshStandardMaterial
        color="#3399cc"
        transparent
        opacity={0.2}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
      <lineSegments>
        <edgesGeometry
          args={[new THREE.CylinderGeometry(radius, radius, height, 48)]}
        />
        <lineBasicMaterial color="#0088ff" />
      </lineSegments>
    </mesh>
  );
}

export default function RouteIntersection3D({
  routeAngles = [0, 45, 135],
  routeLength = 100,
  routeWidth = 30,
  tunnelHeight = 20,
  position = [0, 0, 0],
}) {
  return (
    <group>
      {routeAngles.map((angleDegrees, index) => {
        const radians = THREE.MathUtils.degToRad(angleDegrees);

        const end = [
          position[0] + Math.sin(radians) * routeLength,
          position[1],
          position[2] + Math.cos(radians) * routeLength,
        ];

        return (
          <RouteTunnel
            key={index}
            start={position}
            end={end}
            width={routeWidth}
            height={tunnelHeight}
          />
        );
      })}

      <RouteJunction
        position={position}
        radius={routeWidth / 2}
        height={tunnelHeight}
      />
    </group>
  );
}
