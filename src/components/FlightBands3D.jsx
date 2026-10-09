import React from 'react';
import * as THREE from 'three';
import { geoTo3D } from '../utils/geoTo3D';

const CONFORMANCE_MARGIN_FT = 11;
const LAYER_SEPARATION_FT = 10;
const SLOTS_PER_BAND = [3, 3, 3, 2];

const NETWORK_ORIGIN = [-84.302888917, 34.074449209];

const BAND_COLORS = [
    '#3399cc',
    '#00aa88',
    '#cc9933',
    '#aa66cc',
];

export default function FlightBands3D({
    floorAGL,
    maxAGL,
    routes = [],
    routeWidth = 30,
}) {
    const slotHeight = 2 * CONFORMANCE_MARGIN_FT;
    const slotSpacing = slotHeight + LAYER_SEPARATION_FT;

    let slotIndex = 0;

    return (
        <group>
            {SLOTS_PER_BAND.flatMap((count, bandIndex) =>
                Array.from({ length: count }, (_, slotInBand) => {
                    const slotFloor = floorAGL + slotIndex * slotSpacing;
                    slotIndex += 1;

                    if (slotFloor + slotHeight > maxAGL) {
                        return null;
                    }

                    return (
                        <group key={`${bandIndex}-${slotInBand}`}>
                            {routes.flatMap((route) => {
                                const coordinates = route.geometry.coordinates;

                                return coordinates.slice(0, -1).map(
                                    (startCoordinate, segmentIndex) => {
                                        const endCoordinate =
                                            coordinates[segmentIndex + 1];

                                        const [x1, z1] = geoTo3D(
                                            startCoordinate,
                                            NETWORK_ORIGIN
                                        );

                                        const [x2, z2] = geoTo3D(
                                            endCoordinate,
                                            NETWORK_ORIGIN
                                        );

                                        const dx = x2 - x1;
                                        const dz = z2 - z1;

                                        const segmentLength = Math.sqrt(
                                            dx * dx + dz * dz
                                        );

                                        const angle = Math.atan2(dx, dz);

                                        const segmentWidth =
                                            Number(
                                                route.segment_attributes?.[
                                                    segmentIndex
                                                ]?.route_width_ft
                                            ) || routeWidth;

                                        return (
                                            <mesh
                                                key={`${route.route_id}-${segmentIndex}`}
                                                position={[
                                                    (x1 + x2) / 2,
                                                    slotFloor + slotHeight / 2,
                                                    (z1 + z2) / 2,
                                                ]}
                                                rotation={[0, angle, 0]}
                                            >
                                                <boxGeometry
                                                    args={[
                                                        segmentWidth,
                                                        slotHeight,
                                                        segmentLength,
                                                    ]}
                                                />

                                                <meshStandardMaterial
                                                    color={BAND_COLORS[bandIndex]}
                                                    transparent
                                                    opacity={0.12}
                                                    depthWrite={false}
                                                    side={THREE.DoubleSide}
                                                />

                                                <lineSegments>
                                                    <edgesGeometry
                                                        args={[
                                                            new THREE.BoxGeometry(
                                                                segmentWidth,
                                                                slotHeight,
                                                                segmentLength
                                                            ),
                                                        ]}
                                                    />
                                                    <lineBasicMaterial
                                                        color={BAND_COLORS[bandIndex]}
                                                    />
                                                </lineSegments>
                                            </mesh>
                                        );
                                    }
                                );
                            })}
                        </group>
                    );
                })
            )}
        </group>
    );
}