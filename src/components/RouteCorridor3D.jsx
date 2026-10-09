import React, { useMemo } from 'react';
import * as THREE from 'three';
import { geoTo3D } from '../utils/geoTo3D';
import { NETWORK_ORIGIN } from '../config/network3d';


const EPSILON = 0.000001;

function buildCorridorGeometry(route, slotHeight, defaultWidth) {
    const coordinates = route.geometry.coordinates;

    if (coordinates.length < 2) {
        return null;
    }

    const points = coordinates.map(coordinate =>
        geoTo3D(coordinate, NETWORK_ORIGIN)
    );

    const widths = points.slice(0, -1).map((_, index) =>
        Number(route.segment_attributes?.[index]?.route_width_ft) ||
        defaultWidth
    );

    const directions = [];
    const normals = [];

    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1][0] - points[i][0];
        const dz = points[i + 1][1] - points[i][1];
        const length = Math.hypot(dx, dz);

        if (length < EPSILON) {
            return null;
        }

        directions.push([dx / length, dz / length]);
        normals.push([-dz / length, dx / length]);
    }

    const left = [];
    const right = [];

    for (let i = 0; i < points.length; i++) {
        let offsetX;
        let offsetZ;

        if (i === 0 || i === points.length - 1) {
            const segmentIndex = i === 0 ? 0 : normals.length - 1;
            const halfWidth = widths[segmentIndex] / 2;

            offsetX = normals[segmentIndex][0] * halfWidth;
            offsetZ = normals[segmentIndex][1] * halfWidth;
        } else {
            const previousNormal = normals[i - 1];
            const nextNormal = normals[i];

            const halfWidth = Math.max(widths[i - 1], widths[i]) / 2;

            const miterX = previousNormal[0] + nextNormal[0];
            const miterZ = previousNormal[1] + nextNormal[1];
            const miterLength = Math.hypot(miterX, miterZ);

            if (miterLength < EPSILON) {
                return null;
            }

            const unitX = miterX / miterLength;
            const unitZ = miterZ / miterLength;

            const projection =
                unitX * nextNormal[0] +
                unitZ * nextNormal[1];

            const miterDistance = halfWidth / projection;

            offsetX = unitX * miterDistance;
            offsetZ = unitZ * miterDistance;
        }

        left.push([
            points[i][0] + offsetX,
            points[i][1] + offsetZ,
        ]);

        right.push([
            points[i][0] - offsetX,
            points[i][1] - offsetZ,
        ]);
    }

    const vertices = [];
    const indices = [];

    function addQuad(a, b, c, d) {
        const start = vertices.length / 3;

        vertices.push(...a, ...b, ...c, ...d);

        indices.push(
            start, start + 1, start + 2,
            start, start + 2, start + 3
        );
    }

    for (let i = 0; i < points.length - 1; i++) {
        const l0 = left[i];
        const r0 = right[i];
        const l1 = left[i + 1];
        const r1 = right[i + 1];

        const bottom = 0;
        const top = slotHeight;

        // Top and bottom surfaces.
        addQuad(
            [l0[0], top, l0[1]],
            [r0[0], top, r0[1]],
            [r1[0], top, r1[1]],
            [l1[0], top, l1[1]]
        );

        addQuad(
            [r0[0], bottom, r0[1]],
            [l0[0], bottom, l0[1]],
            [l1[0], bottom, l1[1]],
            [r1[0], bottom, r1[1]]
        );

        // Left and right walls.
        addQuad(
            [l0[0], bottom, l0[1]],
            [l0[0], top, l0[1]],
            [l1[0], top, l1[1]],
            [l1[0], bottom, l1[1]]
        );

        addQuad(
            [r1[0], bottom, r1[1]],
            [r1[0], top, r1[1]],
            [r0[0], top, r0[1]],
            [r0[0], bottom, r0[1]]
        );
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

export default function RouteCorridor3D({
    route,
    slotFloor,
    slotHeight,
    color,
    defaultWidth = 30,
}) {
    const geometry = useMemo(
        () => buildCorridorGeometry(route, slotHeight, defaultWidth),
        [route, slotHeight, defaultWidth]
    );

    const outlineGeometry = useMemo(() => {
        if (!geometry) {
            return null;
        }

        const edges = new THREE.EdgesGeometry(geometry);
        const positions = edges.getAttribute('position');
        const filtered = [];

        const coordinates = route.geometry.coordinates;
        const start = geoTo3D(coordinates[0], NETWORK_ORIGIN);
        const end = geoTo3D(coordinates[coordinates.length - 1], NETWORK_ORIGIN);

        const tolerance = 0.01;

        for (let i = 0; i < positions.count; i += 2) {
            const x1 = positions.getX(i);
            const z1 = positions.getZ(i);
            const x2 = positions.getX(i + 1);
            const z2 = positions.getZ(i + 1);

            const atStart =
                Math.hypot(x1 - start[0], z1 - start[1]) <= defaultWidth &&
                Math.hypot(x2 - start[0], z2 - start[1]) <= defaultWidth;

            const atEnd =
                Math.hypot(x1 - end[0], z1 - end[1]) <= defaultWidth &&
                Math.hypot(x2 - end[0], z2 - end[1]) <= defaultWidth;

            if (!atStart && !atEnd) {
                filtered.push(
                    positions.getX(i), positions.getY(i), positions.getZ(i),
                    positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1)
                );
            }
        }

        edges.dispose();

        const result = new THREE.BufferGeometry();
        result.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(filtered, 3)
        );

        return result;
    }, [geometry, route, defaultWidth]);

    if (!geometry) {
        return null;
    }

    return (
        <group position={[0, slotFloor, 0]}>
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.12}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <lineSegments geometry={outlineGeometry}>
                <lineBasicMaterial color={color} />
            </lineSegments>
        </group>
    );
}