
import React from 'react';
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { API_BASE_URL } from '../config/api';
import RouteIntersection3D from './RouteIntersection3D';
import DronePort3D from './DronePort3D';

export default function Network3DView() {

    const [referenceData, setReferenceData] = useState(null);

    useEffect(() => {
        async function loadReferenceData() {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/reference-data`,
                    { credentials: 'same-origin' }
                );

                const result = await response.json();

                if (!response.ok) {
                    console.error('Reference data error:', result);
                    return;
                }

                setReferenceData(result);

                console.log('3D floor AGL:', result.default_floor_agl_ft);
                console.log('3D maximum AGL:', result.default_max_agl_ft);
            } catch (error) {
                console.error('3D reference data load failed:', error);
            }
        }

        loadReferenceData();
    }, []);

    const floorAGL = Number(referenceData?.default_floor_agl_ft);
    const maxAGL = Number(referenceData?.default_max_agl_ft);

    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <Canvas camera={{ position: [100, 100, 180], fov: 50 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[20, 40, 20]} intensity={1.2} />

                {Number.isFinite(floorAGL) && (
                    <RouteIntersection3D
                        routeAngles={[180, 45, -51.34]}
                        routeLength={100}
                        routeWidth={30}
                        tunnelHeight={20}
                        position={[0, floorAGL, 0]}
                    />
                )}

                {Number.isFinite(maxAGL) && (
                    <DronePort3D
                        position={[0, 0, -100]}
                        diameter={30}
                        height={maxAGL}
                    />
                )}

                <gridHelper args={[400, 40]} />
                <axesHelper args={[50]} />
                <OrbitControls target={[0, 150, 0]} />
            </Canvas>
        </div>
    );
}



