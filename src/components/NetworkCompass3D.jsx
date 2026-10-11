import React, { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function NetworkCompass3D({ onHeadingChange }) {
    useFrame(({ camera }) => {
        const north = new THREE.Vector3(0, 0, -1);
        north.transformDirection(camera.matrixWorldInverse);

        const angle = Math.atan2(north.x, north.y);

        onHeadingChange(angle);
    });

    return null;
}