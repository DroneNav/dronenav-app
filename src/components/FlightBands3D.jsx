import React from 'react';
import * as THREE from 'three';
import { geoTo3D } from '../utils/geoTo3D';
import { NETWORK_ORIGIN } from '../config/network3d';
import RouteCorridor3D from './RouteCorridor3D';
import Aircraft3D from './Aircraft3D';
import {
    aircraftPosition3D,
    aircraftCountForLane,
} from '../utils/aircraftPosition3D';


const CONFORMANCE_MARGIN_FT = 10;
const LAYER_SEPARATION_FT = 10;
const SLOTS_PER_BAND = [3, 3, 3, 3];

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

                            {routes.map(route => (
                                <RouteCorridor3D
                                    key={route.route_id}
                                    route={route}
                                    slotFloor={slotFloor}
                                    slotHeight={slotHeight}
                                    color={BAND_COLORS[bandIndex]}
                                    defaultWidth={routeWidth}
                                />
                            ))}

                            {routes.flatMap((route, routeIndex) => {
                                const segmentCount = route.geometry.coordinates.length - 1;

                                if (segmentCount < 1) {
                                    return [];
                                }

                                return [-1, 1].flatMap((laneSide, laneIndex) => {
                                    // Different aircraft counts and positions per Route and slot.
                                    const seed = routeIndex * 37 + slotIndex * 19 + laneIndex * 11;

                                    const random = value => {
                                        const x = Math.sin(value * 127.1 + 78.233) * 43758.5453;
                                        return x - Math.floor(x);
                                    };

                                    const count = aircraftCountForLane(
                                        routeIndex,
                                        slotIndex,
                                        laneIndex
                                    );
                                    
                                    return Array.from({ length: count }, (_, aircraftIndex) => {
                                        const positionSeed = seed + aircraftIndex * 53;

                                        const segmentIndex = Math.min(
                                            Math.floor(random(positionSeed + 2) * segmentCount),
                                            segmentCount - 1
                                        );

                                        const fraction =
                                            0.15 + random(positionSeed + 3) * 0.7;

                                        const aircraft = aircraftPosition3D(
                                            route,
                                            segmentIndex,
                                            fraction,
                                            slotFloor,
                                            slotHeight,
                                            laneSide
                                        );

                                        return aircraft ? (
                                            <Aircraft3D
                                                key={`${route.route_id}-${slotIndex}-${laneSide}-${aircraftIndex}`}
                                                position={aircraft.position}
                                                heading={
                                                    laneSide === 1
                                                        ? aircraft.heading
                                                        : aircraft.heading + Math.PI
                                                }
                                            />
                                        ) : null;
                                    });
                                });
                            })}

                        </group>
                    );
                })
            )}
        </group>
    );
}