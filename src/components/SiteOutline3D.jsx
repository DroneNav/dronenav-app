import React, { useMemo } from 'react';
import * as THREE from 'three';
import { geoTo3D } from '../utils/geoTo3D';
import { NETWORK_ORIGIN } from '../config/network3d';
import { Text } from '@react-three/drei';


export default function SiteOutline3D({ site }) {
    const geometry = useMemo(() => {
        if (site.geometry?.type !== 'Polygon') {
            return null;
        }

        const ring = site.geometry.coordinates?.[0];

        if (!ring || ring.length < 4) {
            return null;
        }

        // GeoJSON rings are already closed.
        // Remove the repeated final coordinate for lineLoop.
        const coordinates = ring.slice(0, -1);

        const points = coordinates.map(coordinate => {
            const [x, z] = geoTo3D(coordinate, NETWORK_ORIGIN);

            return new THREE.Vector3(x, 0, z);
        });

        return new THREE.BufferGeometry().setFromPoints(points);
    }, [site]);

    const ring = site.geometry.coordinates[0];

    // Find the boundary segment with the southernmost midpoint.
    let southSegment = 0;
    let southLatitude = Infinity;

    for (let i = 0; i < ring.length - 1; i++) {
        const midpointLatitude = (ring[i][1] + ring[i + 1][1]) / 2;

        if (midpointLatitude < southLatitude) {
            southLatitude = midpointLatitude;
            southSegment = i;
        }
    }

    const start = geoTo3D(ring[southSegment], NETWORK_ORIGIN);
    const end = geoTo3D(ring[southSegment + 1], NETWORK_ORIGIN);

    const labelX = (start[0] + end[0]) / 2;
    const labelZ = (start[1] + end[1]) / 2;

    if (!geometry) {
        return null;
    }

    return (
        <group>
            <lineLoop geometry={geometry} position={[0, 0.5, 0]}>
                <lineBasicMaterial
                    color="#88aa88"
                    transparent
                    opacity={0.8}
                />
            </lineLoop>

            <Text
                position={[labelX, 1, labelZ]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={40}
                color="#88aa88"
                anchorX="center"
                anchorY="bottom"
            >
                {site.site_name}
            </Text>
        </group>
    );
}