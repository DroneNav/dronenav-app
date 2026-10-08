
import React from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function RouteTunnel({ start, end, width = 30, height = 20 }) {
    const startPoint = new THREE.Vector3(...start);
    const endPoint = new THREE.Vector3(...end);

    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
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

function RouteJunction({
    position,
    radius = 15,
    height = 20,
}) {
    return (
        <mesh position={[position[0], position[1] + height / 2, position[2]]}>
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

export default function Network3DView() {
    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <Canvas camera={{ position: [100, 100, 180], fov: 50 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[20, 40, 20]} intensity={1.2} />

                <RouteTunnel
                    start={[0, 0, -100]}
                    end={[0, 0, 0]}
                />

                <RouteTunnel
                    start={[0, 0, 0]}
                    end={[100, 0, 100]}
                />
                
                <RouteTunnel
                    start={[0, 0, 0]}
                    end={[-100, 0, 80]}
                />

                <RouteJunction position={[0, 0, 0]} />

                <gridHelper args={[400, 40]} />
                <axesHelper args={[50]} />
                <OrbitControls />
            </Canvas>
        </div>
    );
}