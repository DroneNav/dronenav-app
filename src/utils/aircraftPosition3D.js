import { geoTo3D } from './geoTo3D';
import { NETWORK_ORIGIN } from '../config/network3d';

export function aircraftPosition3D(
  route,
  segmentIndex,
  fraction,
  slotFloor,
  slotHeight,
  laneSide
) {
  const coordinates = route.geometry.coordinates;

  const start = geoTo3D(
    coordinates[segmentIndex],
    NETWORK_ORIGIN
  );

  const end = geoTo3D(
    coordinates[segmentIndex + 1],
    NETWORK_ORIGIN
  );

  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);

  if (length === 0) {
    return null;
  }

  const width =
    Number(route.segment_attributes?.[segmentIndex]?.route_width_ft) || 30;

  // Lane centers are one-quarter of the corridor width
  // to either side of the Route centerline.
  const offset = (width / 4) * laneSide;

  const normalX = -dz / length;
  const normalZ = dx / length;

  const x = start[0] + dx * fraction + normalX * offset;
  const z = start[1] + dz * fraction + normalZ * offset;

  const y = slotFloor + slotHeight / 2;

  // Aircraft geometry points toward negative Z at heading zero.
  const heading = Math.atan2(-dx, -dz);

  return {
    position: [x, y, z],
    heading,
  };
}

export function aircraftCountForLane(routeIndex, slotIndex, laneIndex) {
  const seed = routeIndex * 37 + slotIndex * 19 + laneIndex * 11;

  const x = Math.sin((seed + 1) * 127.1 + 78.233) * 43758.5453;
  const randomValue = x - Math.floor(x);

  return Math.floor(randomValue * 3);
}