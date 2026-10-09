
import React from 'react';
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { API_BASE_URL } from '../config/api';
import RouteIntersection3D from './RouteIntersection3D';
import DronePort3D from './DronePort3D';
import FlightBands3D from './FlightBands3D';
import { geoTo3D } from '../utils/geoTo3D';


export default function Network3DView() {

    const [referenceData, setReferenceData] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [droneports, setDroneports] = useState([]);

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

    useEffect(() => {
        async function loadRoutes() {
            try {
                const response = await fetch(`${API_BASE_URL}/routes`, {
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    console.error('3D Routes request failed:', response.status);
                    return;
                }

                const result = await response.json();

                const intersectionNodeId =
                    '01a082fc-f326-71df-a7cf-3eac130ad3fd';

                const intersectionRoutes = result.routes.filter(
                    (route) =>
                        route.operational_status === 'active' &&
                        route.destination_route_node_id === intersectionNodeId
                );

                setRoutes(intersectionRoutes);

                console.log(
                    '3D intersection Routes:',
                    intersectionRoutes.map((route) => route.route_name)
                );
            } catch (error) {
                console.error('Failed to load 3D Routes:', error);
            }
        }

        loadRoutes();
    }, []);

    useEffect(() => {
        async function loadDroneports() {
            try {
                const response = await fetch(`${API_BASE_URL}/droneports`);

                if (!response.ok) {
                    throw new Error('Failed to load DronePorts');
                }

                const result = await response.json();

                const activeDroneports = result.droneports.filter(
                    droneport => droneport.operational_status === 'active'
                );

                setDroneports(activeDroneports);

                console.log(
                    '3D active DronePorts:',
                    activeDroneports.map(droneport => droneport.droneport_name)
                );
            } catch (error) {
                console.error('3D DronePort loading failed:', error);
            }
        }

        loadDroneports();
    }, []);

    const floorAGL = Number(referenceData?.default_floor_agl_ft);
    const maxAGL = Number(referenceData?.default_max_agl_ft);

    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <Canvas camera={{ position: [100, 100, 180], fov: 50 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[20, 40, 20]} intensity={1.2} />

                {Number.isFinite(floorAGL) && Number.isFinite(maxAGL) && (
                    <FlightBands3D
                        floorAGL={floorAGL}
                        maxAGL={maxAGL}
                        routes={routes}
                        routeAngles={[180, 45, -51.34]}
                        routeLength={100}
                        routeWidth={30}
                    />
                )}

                {Number.isFinite(maxAGL) && droneports.map(droneport => {
                    const [x, z] = geoTo3D(
                        droneport.geometry.coordinates,
                        [-84.302888917, 34.074449209]
                    );

                    return (
                        <DronePort3D
                            key={droneport.droneport_id}
                            position={[x, 0, z]}
                            diameter={droneport.droneport_diameter_ft}
                            height={maxAGL}
                        />
                    );
                })}

                <gridHelper args={[400, 40]} />
                <axesHelper args={[50]} />
                <OrbitControls target={[0, 150, 0]} />
            </Canvas>
        </div>
    );
}



