import React from 'react';
import * as THREE from 'three';
import { geoTo3D } from '../utils/geoTo3D';
import { NETWORK_ORIGIN } from '../config/network3d';
import RouteCorridor3D from './RouteCorridor3D';


const CONFORMANCE_MARGIN_FT = 11;
const LAYER_SEPARATION_FT = 10;
const SLOTS_PER_BAND = [3, 3, 3, 2];

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
                        </group>
                    );
                })
            )}
        </group>
    );
}