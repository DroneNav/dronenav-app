const FEET_PER_DEGREE_LATITUDE = 364000;

export function geoTo3D(coordinates, origin) {
    const [longitude, latitude] = coordinates;
    const [originLongitude, originLatitude] = origin;

    const latitudeRadians = (originLatitude * Math.PI) / 180;

    const x =
        (longitude - originLongitude) *
        FEET_PER_DEGREE_LATITUDE *
        Math.cos(latitudeRadians);

    const z =
        -(latitude - originLatitude) *
        FEET_PER_DEGREE_LATITUDE;

    return [x, z];
}