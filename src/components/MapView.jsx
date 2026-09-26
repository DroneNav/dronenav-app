import { useState, useEffect, Fragment } from 'react';

import { API_BASE_URL } from '../config/api';

import {
    MapContainer,
    TileLayer,
    Pane,
    Marker,
    Popup,
    Polygon,
    Polyline,
    Circle,
    CircleMarker,
    useMap,
    useMapEvents,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet-polylinedecorator';
import 'leaflet/dist/leaflet.css';

import {
    MAP_TILE_URL,
    MAP_TILE_ATTRIBUTION,
    DEFAULT_MAP_CENTER,
    DEFAULT_MAP_ZOOM,
} from '../config/mapConfig';

function MapPositionTracker({ onMove }) {
    useMapEvents({
        moveend(e) {
            const center = e.target.getCenter();

            onMove((current) => {
                if (
                    current[0] === center.lat &&
                    current[1] === center.lng
                ) {
                    return current;
                }

                return [center.lat, center.lng];
            });
        },
    });

    return null;
}

function MapZoomDebug() {
    useMapEvents({
        zoomstart(e) {
            console.log('ZOOM START:', e.target.getZoom());
        },

        zoomend(e) {
            console.log('ZOOM END:', e.target.getZoom());
        },
    });

    return null;
}

function MapMouseTracker({ onMove }) {
    useMapEvents({
        mousemove(event) {
            onMove((current) => {
                if (
                    current?.lat === event.latlng.lat &&
                    current?.lng === event.latlng.lng
                ) {
                    return current;
                }

                return event.latlng;
            });
        },
    });

    return null;
}

function MapContextBounds({ bounds }) {
    const map = useMap();

    useEffect(() => {
        if (!bounds?.southWest || !bounds?.northEast) {
            return;
        }

        map.fitBounds(
            [
                bounds.southWest,
                bounds.northEast,
            ],
            {
                padding: [30, 30],
                maxZoom: 18,
            }
        );
    }, [map, bounds]);

    return null;
}

function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });

    return null;
}

function RouteArrows({
    positions,
    direction,
    selected = false,
    deEmphasized = false,
}) {
    const map = useMapEvents({});

    useEffect(() => {
        if (!positions || positions.length < 2) {
            return;
        }

        const arrowPositions =
            direction === 1
                ? [...positions].reverse()
                : positions;

        const decorator = L.polylineDecorator(
            L.polyline(arrowPositions),
            {
                patterns: [
                    {
                        offset: '5%',
                        repeat: '20%',
                        symbol: L.Symbol.arrowHead({
                            pixelSize: 6,
                            polygon: false,
                            pathOptions: {
                                color: deEmphasized ? 'gray' : 'green',
                                stroke: true,
                                weight: selected ? 4 : 2,
                                opacity: deEmphasized ? 0.35 : 0.8,
                                interactive: false,
                            },
                        }),
                    },
                ],
            }
        );

        decorator.addTo(map);

        return () => {
            map.removeLayer(decorator);
        };
    }, [map, positions, direction]);

    return null;
}

function offsetPositions(positions, offsetFeet) {
    const offsetDegrees = (offsetFeet * 0.3048) / 111320;

    return positions.map((position, index) => {
        const previous = positions[index - 1] || position;
        const next = positions[index + 1] || position;

        const dx = next[1] - previous[1];
        const dy = next[0] - previous[0];

        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) {
            return position;
        }

        const offsetLat = (-dx / length) * offsetDegrees;
        const offsetLng = (dy / length) * offsetDegrees;

        return [
            position[0] + offsetLat,
            position[1] + offsetLng,
        ];
    });
}

function getRouteDirectionLabel(direction) {
    if (direction === 0) {
        return 'One-way';
    }

    if (direction === 1) {
        return 'Reverse';
    }

    if (direction === 2) {
        return 'Bi-directional';
    }

    return 'Unknown';
}

function RoutePopup({ route }) {
    return (
        <Popup>
            <strong>{route.route_name}</strong>
            <br />
            Type: {route.route_type}
            <br />
            Status: {route.operational_status}
            <br />
            Survey: {route.survey_status}
            <br />
            Origin Site ID: {route.origin_site_id}
            <br />
            Destination Site ID: {route.destination_site_id}
            <br />
            Minimum Aircraft Weight: {route.minimum_aircraft_weight_lbs}
            <br />
            Maximum Aircraft Weight: {route.maximum_aircraft_weight_lbs}
            <br />
            Route Direction: {getRouteDirectionLabel(route.direction)}
            <br />
            Maximum Aircraft Capacity: {route.maximum_aircraft_capacity}
            <br />
            Route ID: {route.route_id}
            <br />
            Created by: {route.created_by}
        </Popup>
    );
}

function calculateInteriorAngleDegrees(firstPoint, vertexPoint, thirdPoint) {
    const latitudeRadians = vertexPoint.lat * Math.PI / 180;

    const firstX =
        (firstPoint.lng - vertexPoint.lng) *
        Math.cos(latitudeRadians);
    const firstY =
        firstPoint.lat - vertexPoint.lat;

    const thirdX =
        (thirdPoint.lng - vertexPoint.lng) *
        Math.cos(latitudeRadians);
    const thirdY =
        thirdPoint.lat - vertexPoint.lat;

    const dotProduct =
        firstX * thirdX +
        firstY * thirdY;

    const firstMagnitude = Math.hypot(firstX, firstY);
    const thirdMagnitude = Math.hypot(thirdX, thirdY);

    if (firstMagnitude === 0 || thirdMagnitude === 0) {
        return null;
    }

    const cosine =
        dotProduct / (firstMagnitude * thirdMagnitude);

    const clampedCosine = Math.max(-1, Math.min(1, cosine));

    return Math.acos(clampedCosine) * 180 / Math.PI;
}

function findRouteEndpointSnapTarget(latlng, savedRoutes, snapDistanceFt) {
    let nearestTarget = null;
    let nearestDistanceFt = snapDistanceFt;

    savedRoutes.forEach((route) => {
        const coordinates = route.geometry?.coordinates;

        if (!Array.isArray(coordinates) || coordinates.length < 2) {
            return;
        }

        const endpointCoordinates = [
            coordinates[0],
            coordinates[coordinates.length - 1],
        ];

        endpointCoordinates.forEach(([longitude, latitude]) => {
            const distanceMeters = L.latLng(
                latlng.lat,
                latlng.lng
            ).distanceTo(
                L.latLng(latitude, longitude)
            );

            const distanceFeet = distanceMeters * 3.28084;

            if (distanceFeet <= nearestDistanceFt) {
                nearestDistanceFt = distanceFeet;
                nearestTarget = L.latLng(latitude, longitude);
            }
        });
    });

    return nearestTarget;
}

function findDroneportSnapTarget(latlng, savedDroneports, snapDistanceFt) {
    let nearestTarget = null;
    let nearestDistanceFt = snapDistanceFt;

    savedDroneports.forEach((droneport) => {
        const coordinates = droneport.geometry?.coordinates;

        if (
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
        ) {
            return;
        }

        const [longitude, latitude] = coordinates;

        const distanceMeters = L.latLng(
            latlng.lat,
            latlng.lng
        ).distanceTo(
            L.latLng(latitude, longitude)
        );

        const distanceFeet = distanceMeters * 3.28084;

        if (distanceFeet <= nearestDistanceFt) {
            nearestDistanceFt = distanceFeet;
            nearestTarget = L.latLng(latitude, longitude);
        }
    });

    return nearestTarget;
}


export default function MapView({
    readOnly = false,
    siteId = null,
    mode = 'editor',
    overlayType = null,
    overlayUuid = null,
    authorityId: initialAuthorityId = null,
    mapContextRequest = null,
    flightExecutionId = null,
}) {
    const [points, setPoints] = useState([]);
    const [mapMode, setMapMode] = useState('view');
    const [siteName, setSiteName] = useState('');
    const [siteDescription, setSiteDescription] = useState('');
    const [siteType, setSiteType] = useState('school');
    const [zoneName, setZoneName] = useState('');
    const [zoneType, setZoneType] = useState('restricted');
    const [selectedObject, setSelectedObject] = useState(null);
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [droneportName, setDroneportName] = useState('');
    const [droneportType, setDroneportType] = useState('recreation');
    const [droneportDiameter, setDroneportDiameter] = useState(30);
    const [landingSpaceEditorPosition, setLandingSpaceEditorPosition] = useState(null);
    const [showLandingSpaceEditor, setShowLandingSpaceEditor] = useState(false);
    const [addingLandingSpace, setAddingLandingSpace] = useState(false);
    const [changingLandingSpaceLocation, setChangingLandingSpaceLocation] = useState(false);
    const [landingSpaceHeading, setLandingSpaceHeading] = useState(0);
    const [landingSpaceCharging, setLandingSpaceCharging] = useState(false);
    const [landingSpaceStatus, setLandingSpaceStatus] = useState('active');
    const [minimumAircraftWeight, setMinimumAircraftWeight] = useState(4.0);
    const [maximumAircraftWeight, setMaximumAircraftWeight] = useState(50.0);
    const [minimumAltitude, setMinimumAltitude] = useState(0);
    const [maximumAltitude, setMaximumAltitude] = useState(400);
    const [routeDirection, setRouteDirection] = useState('2');
    const [routeBuffering, setRouteBuffering] = useState(0);
    const [routeName, setRouteName] = useState('');
    const [routeType, setRouteType] = useState('open');
    const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
    const [currentCenter, setCurrentCenter] = useState(DEFAULT_MAP_CENTER);
    const [referenceData, setReferenceData] = useState(null);
    const [authorityId, setAuthorityId] = useState(initialAuthorityId || '');
    const [selectedAuthorityId, setSelectedAuthorityId] = useState(authorityId || '019e886f-5110-7067-90f9-17e73143a30a');
    const [savedSites, setSavedSites] = useState([]);
    const [savedZones, setSavedZones] = useState([]);
    const [savedDroneports, setSavedDroneports] = useState([]);
    const [landingSpaces, setLandingSpaces] = useState([]);
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [savedObstacles, setSavedObstacles] = useState([]);
    const [mapContextData, setMapContextData] = useState(null);
    const [mapContextLoading, setMapContextLoading] = useState(false);
    const [mapContextError, setMapContextError] = useState(null);
    const [actualFlightPositions, setActualFlightPositions] = useState([]);
    const [mousePosition, setMousePosition] = useState(null);

    const pointLabel =
        mapMode === 'create_site'
            ? 'Site Boundary Points'
            : mapMode === 'create_zone'
                ? 'Zone Boundary Points'
                : mapMode === 'create_droneport'
                    ? 'DronePort Location'
                    : mapMode === 'create_route'
                        ? 'Route Points'
                        : 'Points';

    const isReadOnly =
        readOnly ||
        mode === 'site_readonly' ||
        mode === 'survey_readonly' ||
        mode === 'site_summary_readonly' ||
        mode === 'map-context';

    const isSurveyReadOnly = mode === 'survey_readonly';
    const isMapContextMode = mode === 'map-context';

    const selectedMapContextSiteIds = new Set(
        (mapContextData?.selection?.sites || []).map((site) => site.site_id)
    );

    const selectedMapContextZoneIds = new Set(
        (mapContextData?.selection?.zones || []).map((zone) => zone.zone_id)
    );

    const selectedMapContextDroneportIds = new Set(
        (mapContextData?.selection?.droneports || []).map(
            (droneport) => droneport.droneport_id
        )
    );

    const selectedMapContextRouteIds = new Set(
        (mapContextData?.selection?.routes || []).map((route) => route.route_id)
    );

    function handleMapClick(latlng) {
        if (isReadOnly) {
            return;
        }

        if (
            changingLandingSpaceLocation &&
            selectedObject?.type === 'landing_space'
        ) {
            console.log('Proposed landing space location:', {
                latitude: latlng.lat,
                longitude: latlng.lng,
            });

            setChangingLandingSpaceLocation(false);
            return;
        }

        if (
            mapMode !== 'create_site' &&
            mapMode !== 'create_zone' &&
            mapMode !== 'create_droneport' &&
            mapMode !== 'create_route'
        ) {
            return;
        }

        if (mapMode === 'create_droneport') {
            const snapTarget =
                findRouteEndpointSnapTarget(
                    latlng,
                    savedRoutes,
                    ROUTE_ENDPOINT_SNAP_DISTANCE_FT
                );

            setPoints([snapTarget || latlng]);
            return;
        }

        if (mapMode === 'create_route') {
            setPoints((currentPoints) => {
                const snapTarget =
                    currentPoints.length === 0
                        ? (
                            findRouteEndpointSnapTarget(
                                latlng,
                                savedRoutes,
                                ROUTE_ENDPOINT_SNAP_DISTANCE_FT
                            ) ||
                            findDroneportSnapTarget(
                                latlng,
                                savedDroneports,
                                ROUTE_ENDPOINT_SNAP_DISTANCE_FT
                            )
                        )
                        : null;

                const candidatePoint = snapTarget || latlng;
                if (currentPoints.length === 0) {
                    return [candidatePoint];
                }

                if (currentPoints.length === 1) {
                    const lastPoint = currentPoints[0];

                    const distanceMeters = L.latLng(
                        lastPoint.lat,
                        lastPoint.lng
                    ).distanceTo(
                        L.latLng(candidatePoint.lat, candidatePoint.lng)
                    );

                    const distanceFeet = distanceMeters * 3.28084;

                    console.log(
                        'First Route segment distance:',
                        distanceFeet,
                        'ft'
                    );

                    if (distanceFeet < MIN_ROUTE_SEGMENT_LENGTH_FT) {
                        return currentPoints;
                    }
                }

                if (currentPoints.length >= 2) {
                    const firstPoint = currentPoints[currentPoints.length - 2];
                    const vertexPoint = currentPoints[currentPoints.length - 1];

                    const angleDegrees = calculateInteriorAngleDegrees(
                        firstPoint,
                        vertexPoint,
                        candidatePoint
                    );

                    if (
                        angleDegrees !== null &&
                        angleDegrees < MIN_ROUTE_INTERIOR_ANGLE_DEGREES
                    ) {
                        return currentPoints;
                    }
                }

                return [...currentPoints, candidatePoint];
            });

            return;
        }

        setPoints((currentPoints) => [...currentPoints, latlng]);
    }

    function clearPoints() {
        setPoints([]);
    }

    function undoLastPoint() {
        setPoints((currentPoints) => currentPoints.slice(0, -1));
    }

    async function loadSites() {
        try {
            const response = await fetch(`${API_BASE_URL}/sites`, { credentials: 'same-origin' });

            const result = await response.json();

            if (!response.ok) {
                console.error('Load sites error:', JSON.stringify(result, null, 2));
                alert('Failed to load sites.');
                return;
            }

            setSavedSites(result.sites || []);
            console.log('Loaded sites:', result.sites);
        } catch (error) {
            console.error('Load sites failed:', error);
            alert('Load sites failed. Check browser console.');
        }
    }

    async function loadZones() {
        try {
            const response = await fetch(`${API_BASE_URL}/zones`, { credentials: 'same-origin' });

            const result = await response.json();

            if (!response.ok) {
                console.error('Load zones error:', JSON.stringify(result, null, 2));
                alert('Failed to load zones.');
                return;
            }

            setSavedZones(result.zones || []);
            console.log('Loaded zones:', result.zones);
        } catch (error) {
            console.error('Load zones failed:', error);
            alert('Load zones failed. Check browser console.');
        }
    }

    async function loadObstacles() {
        try {
            const response = await fetch(`${API_BASE_URL}/obstacles`, {
                credentials: 'same-origin',
            });

            const result = await response.json();

            if (!response.ok) {
                console.error(
                    'Load obstacles error:',
                    JSON.stringify(result, null, 2)
                );
                alert('Failed to load obstacles.');
                return;
            }

            setSavedObstacles(result.obstacles || []);
            console.log('Loaded obstacles:', result.obstacles);
        } catch (error) {
            console.error('Load obstacles failed:', error);
            alert('Load obstacles failed. Check browser console.');
        }
    }

    async function loadDroneports() {
        try {
            const response = await fetch(`${API_BASE_URL}/droneports`, { credentials: 'same-origin' });

            const result = await response.json();

            if (!response.ok) {
                console.error('Load droneports error:', JSON.stringify(result, null, 2));
                alert('Failed to load droneports.');
                return;
            }

            setSavedDroneports(result.droneports || []);
            console.log('Loaded droneports:', result.droneports);
        } catch (error) {
            console.error('Load droneports failed:', error);
            alert('Load droneports failed. Check browser console.');
        }
    }

    async function loadLandingSpaces(droneportId) {
        if (!droneportId) {
            setLandingSpaces([]);
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/droneport-landing-spaces?droneport_id=${droneportId}`,
                { credentials: 'same-origin' }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error(
                    'Load landing spaces error:',
                    JSON.stringify(result, null, 2)
                );
                alert('Failed to load landing spaces.');
                return;
            }

            setLandingSpaces(result.landing_spaces || []);
            console.log('Loaded landing spaces:', result.landing_spaces);
        } catch (error) {
            console.error('Load landing spaces failed:', error);
            alert('Load landing spaces failed. Check browser console.');
        }
    }

    async function loadRoutes() {
        try {
            const response = await fetch(`${API_BASE_URL}/routes`, { credentials: 'same-origin' });

            const result = await response.json();

            if (!response.ok) {
                console.error('Load routes error:', JSON.stringify(result, null, 2));
                alert('Failed to load routes.');
                return;
            }

            setSavedRoutes(result.routes || []);
            console.log('Loaded routes:', result.routes);
        } catch (error) {
            console.error('Load routes failed:', error);
            alert('Load routes failed. Check browser console.');
        }
    }

    async function loadOverlayPackage(packageSiteId) {
        if (!packageSiteId) {
            alert('Missing site id for overlay package.');
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/sites/${packageSiteId}/package`, { credentials: 'same-origin' }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Load overlay package error:', JSON.stringify(result, null, 2));
                alert('Failed to load overlay package.');
                return;
            }

            setSavedSites(result.site ? [result.site] : []);
            setSavedZones(result.zones || []);
            setSavedDroneports(result.droneports || []);
            setSavedRoutes(result.routes || []);

            console.log('Loaded overlay package:', result);
        } catch (error) {
            console.error('Load overlay package failed:', error);
            alert('Load overlay package failed. Check browser console.');
        }
    }

    async function loadSurveyOverlayPackage(selectedOverlayUuid) {
        if (!selectedOverlayUuid) {
            alert('Missing overlay uuid for survey readonly mode.');
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/governance/overlays/${selectedOverlayUuid}/package`,
                { credentials: 'same-origin' });

            const result = await response.json();

            if (!response.ok) {
                console.error('Load survey overlay package error:', JSON.stringify(result, null, 2));
                alert('Failed to load survey overlay package.');
                return;
            }

            setSavedSites(result.site ? [result.site] : []);
            setSavedZones(result.zones || []);
            setSavedDroneports(result.droneports || []);
            setSavedRoutes(result.routes || []);

            console.log('Loaded survey overlay package:', result);
        } catch (error) {
            console.error('Load survey overlay package failed:', error);
            alert('Load survey overlay package failed. Check browser console.');
        }
    }

    async function loadRouteContextPackage(routeId) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/routes/${routeId}/context-package`,
                { credentials: 'same-origin' });

            const result = await response.json();

            if (!response.ok) {
                console.error('Load route context package error:', JSON.stringify(result, null, 2));
                alert('Failed to load route context package.');
                return;
            }

            const packages = result.packages || [];

            const routeMap = new Map();

            packages
                .flatMap((pkg) => pkg.routes || [])
                .forEach((route) => {
                    routeMap.set(route.route_id, route);
                });

            setSavedSites(packages.map((pkg) => pkg.site).filter(Boolean));
            setSavedZones(packages.flatMap((pkg) => pkg.zones || []));
            setSavedDroneports(packages.flatMap((pkg) => pkg.droneports || []));
            setSavedRoutes(Array.from(routeMap.values()));

            console.log('Loaded route context package:', result);
        } catch (error) {
            console.error('Load route context package failed:', error);
            alert('Load route context package failed. Check browser console.');
        }
    }

    async function loadActualFlightPath() {
        if (!flightExecutionId) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/actual-paths/${flightExecutionId}`,
                { credentials: 'same-origin' });

            if (!response.ok) {
                return;
            }

            const result = await response.json();

            const positions =
                result.geometry?.coordinates?.map(
                    ([longitude, latitude]) => [latitude, longitude]
                ) || [];

            setActualFlightPositions(positions);
        } catch {
            // Actual flight path is optional. Silently ignore failures.
        }
    }

    async function loadMapContext() {
        setMapContextLoading(true);
        setMapContextError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/flight-context`,
                {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(
                        mapContextRequest || {
                            sites: [],
                            zones: [],
                            droneports: [],
                            routes: [],
                        }
                    ),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error(
                    'Load map context error:',
                    JSON.stringify(result, null, 2)
                );

                setMapContextError('Failed to load map context.');
                setMapContextData(null);
                return;
            }

            setMapContextData(result);

            const selection = result.selection || {};
            const context = result.context || {};

            setSavedSites([
                ...(context.sites || []),
                ...(selection.sites || []),
            ]);

            setSavedZones([
                ...(context.zones || []),
                ...(selection.zones || []),
            ]);

            setSavedDroneports([
                ...(context.droneports || []),
                ...(selection.droneports || []),
            ]);

            setSavedRoutes([
                ...(context.routes || []),
                ...(selection.routes || []),
            ]);

            if (flightExecutionId) {
                loadActualFlightPath();
            }

            console.log('Loaded map context:', result);
        } catch (error) {
            console.error('Load map context failed:', error);

            setMapContextError('Map context request failed.');
            setMapContextData(null);
        } finally {
            setMapContextLoading(false);
        }
    }

    async function loadReferenceData() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/reference-data`, { credentials: 'same-origin' });

            const result = await response.json();

            if (!response.ok) {
                console.error('Reference data error:', JSON.stringify(result, null, 2));
                alert('Failed to load reference data.');
                return;
            }

            setReferenceData(result);
            console.log('Loaded reference data:', result);
        } catch (error) {
            console.error('Reference data load failed:', error);
            alert('Reference data load failed. Check browser console.');
        }
    }

    useEffect(() => {
        if (isMapContextMode) {
            loadMapContext();
            return;
        }

        if (
            mode === 'survey_readonly' &&
            overlayType === 'route' &&
            overlayUuid
        ) {
            loadRouteContextPackage(overlayUuid);
            return;
        }

        if (mode === 'site_summary_readonly' && siteId) {
            loadOverlayPackage(siteId);
            return;
        }

        if (isReadOnly && siteId) {
            loadOverlayPackage(siteId);
        }
    }, [
        isMapContextMode,
        isReadOnly,
        siteId,
        mode,
        overlayType,
        overlayUuid,
    ]);

    useEffect(() => {
        loadReferenceData();
    }, []);

    const DEFAULT_ROUTE_WIDTH_FT = 30;
    const DEFAULT_SPEED_LIMIT_MPH = 15;
    const DEFAULT_MINIMUM_SEGMENT_ALTITUDE_FT = 0;
    const DEFAULT_MAXIMUM_SEGMENT_ALTITUDE_FT = 400;
    const MIN_ROUTE_SEGMENT_LENGTH_FT = 501;
    const MIN_ROUTE_INTERIOR_ANGLE_DEGREES = 120;
    const ROUTE_ENDPOINT_SNAP_DISTANCE_FT = 25;

    const polygonPositions = points.map((point) => [point.lat, point.lng]);

    const polylinePositions = points.map((point) => [point.lat, point.lng]);

    const droneportJson =
        points.length === 1
            ? {
                type: 'Point',
                coordinates: [points[0].lng, points[0].lat],
            }
            : null;

    const geoJson =
        points.length >= 3
            ? {
                type: 'Polygon',
                coordinates: [
                    [
                        ...points.map((point) => [point.lng, point.lat]),
                        [points[0].lng, points[0].lat],
                    ],
                ],
            }
            : null;

    const routeJson =
        points.length >= 4
            ? {
                type: 'LineString',
                coordinates: points.map((point) => [point.lng, point.lat]),
            }
            : null;

    const sitePayload =
        geoJson && siteName.trim() && authorityId
            ? {
                authority_id: authorityId,
                site_name: siteName,
                site_type: siteType,
                description: siteDescription,
                created_by: 'dronenav',
                geometry: geoJson,
            }
            : null;

    const siteUpdatePayload =
        selectedObject &&
            selectedObject.type === 'site'
            ? {
                description: siteDescription,
                minimum_altitude_ft: minimumAltitude,
                maximum_altitude_ft: maximumAltitude,
            }
            : null;

    const zonePayload =
        geoJson && zoneName.trim() && selectedSiteId
            ? {
                site_id: selectedSiteId,
                zone_name: zoneName,
                zone_type: zoneType,
                created_by: 'dronenav',
                geometry: geoJson,
            }
            : null;

    const zoneUpdatePayload =
        selectedObject &&
            selectedObject.type === 'zone'
            ? {
                zone_name: zoneName,
                zone_type: zoneType,
                minimum_altitude_ft: minimumAltitude,
                maximum_altitude_ft: maximumAltitude,
            }
            : null;

    const droneportPayload =
        droneportJson && droneportName.trim()
            ? {
                site_id: selectedSiteId || null,
                droneport_name: droneportName,
                droneport_type: droneportType,
                created_by: 'dronenav',
                droneport_diameter_ft: droneportDiameter,
                geometry: droneportJson,
            }
            : null;

    const droneportUpdatePayload =
        selectedObject &&
            selectedObject.type === 'droneport'
            ? {
                droneport_diameter_ft: droneportDiameter,
                droneport_name: droneportName,
                droneport_type: droneportType,
            }
            : null;

    const generatedRouteSegmentAttributes = buildDefaultSegmentAttributes(points);
    const [editableRouteSegmentAttributes, setEditableRouteSegmentAttributes] = useState([]);

    const routePayload =
        routeJson && routeName.trim()
            ? {
                route_name: routeName,
                route_type: routeType,
                created_by: 'dronenav',
                minimum_aircraft_weight_lbs: minimumAircraftWeight,
                maximum_aircraft_weight_lbs: maximumAircraftWeight,
                direction: Number(routeDirection),
                maximum_aircraft_capacity: routeBuffering,
                segment_attributes: generatedRouteSegmentAttributes,
                geometry: routeJson,
            }
            : null;

    const selectedRouteSegmentAttributes =
        selectedObject &&
            selectedObject.type === 'route' &&
            selectedObject.data.geometry?.coordinates?.length >= 4
            ? buildDefaultSegmentAttributes(
                selectedObject.data.geometry.coordinates.map((coordinate) => ({
                    lng: coordinate[0],
                    lat: coordinate[1],
                }))
            )
            : [];

    const routeUpdatePayload =
        selectedObject &&
            selectedObject.type === 'route'
            ? {
                route_name: routeName,
                route_type: routeType,
                minimum_aircraft_weight_lbs: minimumAircraftWeight,
                maximum_aircraft_weight_lbs: maximumAircraftWeight,
                maximum_aircraft_capacity: routeBuffering,
                segment_attributes:
                    editableRouteSegmentAttributes.length > 0
                        ? editableRouteSegmentAttributes
                        : (
                            Array.isArray(selectedObject.data.segment_attributes) &&
                                selectedObject.data.segment_attributes.length > 0
                                ? selectedObject.data.segment_attributes
                                : buildDefaultSegmentAttributes(
                                    selectedObject.data.geometry.coordinates.map((coordinate) => ({
                                        lng: coordinate[0],
                                        lat: coordinate[1],
                                    }))
                                )
                        ),
            }
            : null;

    async function saveSite() {
        if (!sitePayload) {
            alert('Enter a site name and draw a boundary with at least 3 points.');
            return;
        }

        try {
            console.log('Sending payload:', JSON.stringify(sitePayload, null, 2));
            const response = await fetch(`${API_BASE_URL}/sites`, {
                credentials: 'same-origin',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sitePayload),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('API error:', JSON.stringify(result, null, 2));
                alert('Site save failed. Check browser console.');
                return;
            }

            console.log('Site saved:', result);
            alert('Site saved successfully.');
            clearPoints();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Site save failed. Check browser console.');
        }
    }

    async function saveZone() {
        if (!zonePayload) {
            alert('Select a site, enter a zone name, and draw a boundary with at least 3 points.');
            return;
        }

        try {
            console.log('Sending payload:', JSON.stringify(zonePayload, null, 2));
            const response = await fetch(`${API_BASE_URL}/zones`, {
                credentials: 'same-origin',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(zonePayload),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('API error:', JSON.stringify(result, null, 2));
                alert('Zone save failed. Check browser console.');
                return;
            }

            console.log('Zone saved:', result);
            alert('Zone saved successfully.');
            clearPoints();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Zone save failed. Check browser console.');
        }
    }

    async function saveDroneport() {
        if (!droneportPayload) {
            alert('Select a site, enter a droneport name, and select only a single point for the location.');
            return;
        }

        try {
            console.log('Sending payload:', JSON.stringify(droneportPayload, null, 2));
            const response = await fetch(`${API_BASE_URL}/droneports`, {
                credentials: 'same-origin',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(droneportPayload),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('API error:', JSON.stringify(result, null, 2));
                alert('Droneport save failed. Check browser console.');
                return;
            }

            console.log('Droneport saved:', result);
            alert('Droneport saved successfully.');
            clearPoints();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Droneport save failed. Check browser console.');
        }
    }

    async function saveRoute() {
        if (!routePayload) {
            alert('Enter a route name, and select points for at least three route segments before saving.');
            return;
        }

        const finalPoint = points[points.length - 1];

        const destinationSnapTarget =
            findRouteEndpointSnapTarget(
                finalPoint,
                savedRoutes,
                ROUTE_ENDPOINT_SNAP_DISTANCE_FT
            ) ||
            findDroneportSnapTarget(
                finalPoint,
                savedDroneports,
                ROUTE_ENDPOINT_SNAP_DISTANCE_FT
            );

        const payloadToSave = {
            ...routePayload,
            geometry: {
                ...routePayload.geometry,
                coordinates: routePayload.geometry.coordinates.map(
                    (coordinate, index) =>
                        index === routePayload.geometry.coordinates.length - 1 &&
                            destinationSnapTarget
                            ? [
                                destinationSnapTarget.lng,
                                destinationSnapTarget.lat,
                            ]
                            : coordinate
                ),
            },
        };

        if (points.length >= 4) {
            const secondLastPoint = points[points.length - 2];
            const lastPoint = destinationSnapTarget || points[points.length - 1];

            const distanceMeters = L.latLng(
                secondLastPoint.lat,
                secondLastPoint.lng
            ).distanceTo(
                L.latLng(lastPoint.lat, lastPoint.lng)
            );

            const distanceFeet = distanceMeters * 3.28084;

            if (distanceFeet < MIN_ROUTE_SEGMENT_LENGTH_FT) {
                alert(
                    `The final Route segment must be at least ${MIN_ROUTE_SEGMENT_LENGTH_FT} ft.`
                );
                return;
            }
        }

        try {
            console.log('Sending payload:', JSON.stringify(payloadToSave, null, 2));
            const response = await fetch(`${API_BASE_URL}/routes`, {
                credentials: 'same-origin',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payloadToSave),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('API error:', JSON.stringify(result, null, 2));
                alert('Route save failed. Check browser console.');
                return;
            }

            console.log('Route saved:', result);
            alert('Route saved successfully.');
            clearPoints();
        } catch (error) {
            console.error('Route save failed:', error);
            alert('Route save failed. Check browser console.');
        }
    }

    async function deleteSelectedObject() {
        if (!selectedObject) {
            alert('Select an object to delete first.');
            return;
        }

        const confirmed = window.confirm(
            `Delete this ${selectedObject.type}? This cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        const { type, data } = selectedObject;

        const endpoints = {
            site: `${API_BASE_URL}/sites/${data.site_id}`,
            zone: `${API_BASE_URL}/zones/${data.zone_id}`,
            droneport: `${API_BASE_URL}/droneports/${data.droneport_id}`,
            route: `${API_BASE_URL}/routes/${data.route_id}`,
        };

        try {
            console.log('Deleting selected object:', selectedObject);
            console.log('Delete URL:', endpoints[type]);

            const response = await fetch(endpoints[type], {
                credentials: 'same-origin',
                method: 'DELETE',
            });

            console.log('Delete response status:', response.status);

            const result = await response.json();

            console.log('Delete response:', result);

            if (!response.ok) {
                console.error('Delete error:', result);
                alert('Delete failed. Check browser console.');
                return;
            }

            alert('Deleted successfully.');

            setSelectedObject(null);

            if (type === 'site') {
                setSavedSites((current) =>
                    current.filter((site) => site.site_id !== data.site_id)
                );
            } else if (type === 'zone') {
                setSavedZones((current) =>
                    current.filter((zone) => zone.zone_id !== data.zone_id)
                );
            } else if (type === 'droneport') {
                setSavedDroneports((current) =>
                    current.filter(
                        (droneport) =>
                            droneport.droneport_id !== data.droneport_id
                    )
                );
            } else if (type === 'route') {
                setSavedRoutes((current) =>
                    current.filter((route) => route.route_id !== data.route_id)
                );
            }

            if (type === 'site') {
                await loadSites();
            } else if (type === 'zone') {
                await loadZones();
            } else if (type === 'droneport') {
                await loadDroneports();
            } else if (type === 'route') {
                await loadRoutes();
            }
        }
        catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed. Check browser console.');
        }
    }

    async function updateSelectedSite() {
        if (!selectedObject || selectedObject.type !== 'site') {
            alert('Select a site to update.');
            return;
        }

        try {
            const siteId = selectedObject.data.site_id;

            console.log('Updating site:', siteId);
            console.log('Payload:', JSON.stringify(siteUpdatePayload, null, 2));

            const response = await fetch(
                `${API_BASE_URL}/sites/${siteId}`,
                {
                    credentials: 'same-origin',
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(siteUpdatePayload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Update site error:', JSON.stringify(result, null, 2));
                alert('Site update failed. Check browser console.');
                return;
            }

            console.log('Site updated:', result);
            alert('Site updated successfully.');

            setSiteDescription('');
            setMinimumAltitude(0);
            setMaximumAltitude(400);
            setSelectedObject(null);
            await loadSites();
        } catch (error) {
            console.error('Site update failed:', error);
            alert('Site update failed. Check browser console.');
        }
    }

    async function updateSelectedZone() {
        if (!selectedObject || selectedObject.type !== 'zone') {
            alert('Select a Zone to update.');
            return;
        }

        try {
            const zoneId = selectedObject.data.zone_id;

            console.log('Updating zone:', zoneId);
            console.log('Payload:', JSON.stringify(zoneUpdatePayload, null, 2));

            const response = await fetch(
                `${API_BASE_URL}/zones/${zoneId}`,
                {
                    credentials: 'same-origin',
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(zoneUpdatePayload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Update zone error:', JSON.stringify(result, null, 2));
                alert('Zone update failed. Check browser console.');
                return;
            }

            console.log('Zone updated:', result);
            alert('Zone updated successfully.');

            setZoneName('');
            setZoneType('restricted');
            setMinimumAltitude(0);
            setMaximumAltitude(400);
            setSelectedObject(null);
            await loadZones();
        } catch (error) {
            console.error('Zone update failed:', error);
            alert('Zone update failed. Check browser console.');
        }
    }

    async function updateSelectedDroneport() {
        if (!selectedObject || selectedObject.type !== 'droneport') {
            alert('Select a DronePort to update.');
            return;
        }

        try {
            const droneportId = selectedObject.data.droneport_id;

            console.log('Updating droneport:', droneportId);
            console.log('Payload:', JSON.stringify(droneportUpdatePayload, null, 2));

            const response = await fetch(
                `${API_BASE_URL}/droneports/${droneportId}`,
                {
                    credentials: 'same-origin',
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(droneportUpdatePayload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Update droneport error:', JSON.stringify(result, null, 2));
                alert('DronePort update failed. Check browser console.');
                return;
            }

            console.log('DronePort updated:', result);
            alert('DronePort updated successfully.');

            setDroneportName('');
            setDroneportType('recreation');
            setDroneportDiameter(30);
            setSelectedObject(null);
            await loadDroneports();
        } catch (error) {
            console.error('DronePort update failed:', error);
            alert('DronePort update failed. Check browser console.');
        }
    }

    async function updateSelectedLandingSpace() {
        if (!selectedObject || selectedObject.type !== 'landing_space') {
            return;
        }

        const landingSpaceId = selectedObject.data.landing_space_id;

        const payload = {
            heading_degrees: landingSpaceHeading,
            charging_capable: landingSpaceCharging,
            operational_status: landingSpaceStatus,
        };

        try {
            const response = await fetch(
                `${API_BASE_URL}/droneport-landing-spaces/${landingSpaceId}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error(
                    'Update landing space error:',
                    JSON.stringify(result, null, 2)
                );
                alert('Failed to update landing space.');
                return;
            }

            await loadLandingSpaces(selectedObject.data.droneport_id);

            console.log('Updated landing space:', result);
        } catch (error) {
            console.error('Update landing space failed:', error);
            alert('Update landing space failed. Check browser console.');
        }
    }

    async function updateSelectedRoute() {
        if (!selectedObject || selectedObject.type !== 'route') {
            alert('Select a Route to update.');
            return;
        }

        try {
            const routeId = selectedObject.data.route_id;

            console.log('Updating route:', routeId);
            console.log('Payload:', JSON.stringify(routeUpdatePayload, null, 2));

            const response = await fetch(
                `${API_BASE_URL}/routes/${routeId}`,
                {
                    credentials: 'same-origin',
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(routeUpdatePayload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Update route error:', JSON.stringify(result, null, 2));
                alert('Route update failed. Check browser console.');
                return;
            }

            console.log('Route updated:', result);
            alert('Route updated successfully.');

            setRouteName('');
            setRouteType('open');
            setMinimumAircraftWeight(4);
            setMaximumAircraftWeight(50);
            setRouteBuffering(0);
            setSelectedObject(null);
            await loadRoutes();
        } catch (error) {
            console.error('Route update failed:', error);
            alert('Route update failed. Check browser console.');
        }
    }

    function getSelectedOverlayId() {
        if (!selectedObject) {
            return null;
        }

        if (selectedObject.type === 'site') {
            return selectedObject.data.site_id;
        }

        if (selectedObject.type === 'zone') {
            return selectedObject.data.zone_id;
        }

        if (selectedObject.type === 'droneport') {
            return selectedObject.data.droneport_id;
        }

        if (selectedObject.type === 'route') {
            return selectedObject.data.route_id;
        }

        return null;
    }

    function isSelectedSurveyOverlay(type, data) {
        if (!isSurveyReadOnly || !overlayUuid) {
            return false;
        }

        switch (type) {
            case 'site':
                return data.site_id === overlayUuid;

            case 'zone':
                return data.zone_id === overlayUuid;

            case 'droneport':
                return data.droneport_id === overlayUuid;

            case 'route':
                return data.route_id === overlayUuid;

            default:
                return false;
        }
    }

    function buildDefaultSegmentAttributes(routePoints) {
        if (!routePoints || routePoints.length < 4) {
            return [];
        }

        return routePoints.slice(0, -1).map((point, index) => {
            const isDepartureSegment = index === 0;
            const isApproachSegment = index === routePoints.length - 2;
            const isApproachOrDeparture =
                isDepartureSegment || isApproachSegment;

            return {
                route_width_ft: DEFAULT_ROUTE_WIDTH_FT,
                minimum_altitude_ft: isApproachOrDeparture
                    ? DEFAULT_MINIMUM_SEGMENT_ALTITUDE_FT
                    : 45,
                maximum_altitude_ft: isApproachOrDeparture
                    ? 55
                    : DEFAULT_MAXIMUM_SEGMENT_ALTITUDE_FT,
                speed_limit_mph: DEFAULT_SPEED_LIMIT_MPH,
            };
        });
    }

    function updateEditableRouteSegmentAttribute(index, field, value) {
        setEditableRouteSegmentAttributes((current) =>
            current.map((segment, segmentIndex) =>
                segmentIndex === index
                    ? {
                        ...segment,
                        [field]: Number(value),
                    }
                    : segment
            )
        );
    }

    function getRouteSegmentLabel(index, totalSegments) {
        if (index === 0) {
            return 'Departure Segment';
        }

        if (index === totalSegments - 1) {
            return 'Approach Segment';
        }

        return `Intermediate Segment ${index}`;
    }

    async function surveySelectedObject() {
        if (!selectedObject) {
            alert('Select an object first.');
            return;
        }

        const overlayId = getSelectedOverlayId();
        const surveyedBy = 'dronenav';

        try {
            const response = await fetch(
                `${API_BASE_URL}/governance/overlays/${selectedObject.type}s/${overlayId}/survey`,
                {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ surveyed_by: 'dronenav' }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Survey error:', result);
                alert('Survey action failed. Check browser console.');
                return;
            }

            alert('Survey status updated.');

            setSelectedObject(null);

            if (selectedObject.type === 'site') await loadSites();
            if (selectedObject.type === 'zone') await loadZones();
            if (selectedObject.type === 'droneport') await loadDroneports();
            if (selectedObject.type === 'route') await loadRoutes();
        } catch (error) {
            console.error('Survey action failed:', error);
            alert('Survey action failed. Check browser console.');
        }
    }

    async function expireSurveySelectedObject() {
        if (!selectedObject) {
            alert('Select an object first.');
            return;
        }

        const overlayId = getSelectedOverlayId();

        try {
            const response = await fetch(
                `${API_BASE_URL}/governance/overlays/${selectedObject.type}s/${overlayId}/expire-survey`,
                {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Expire survey error:', result);
                alert('Expire survey failed. Check browser console.');
                return;
            }

            alert('Survey expired.');

            setSelectedObject(null);

            if (selectedObject.type === 'site') await loadSites();
            if (selectedObject.type === 'zone') await loadZones();
            if (selectedObject.type === 'droneport') await loadDroneports();
            if (selectedObject.type === 'route') await loadRoutes();
        } catch (error) {
            console.error('Expire survey failed:', error);
            alert('Expire survey failed. Check browser console.');
        }
    }

    async function surveySelectedSitePackage() {
        if (!selectedObject || selectedObject.type !== 'site') {
            alert('Select a site first.');
            return;
        }

        const siteId = selectedObject.data.site_id;
        const surveyedBy = 'dronenav';

        try {
            const response = await fetch(
                `${API_BASE_URL}/governance/overlays/${siteId}/survey-package`,
                {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        surveyed_by: surveyedBy,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Survey package error:', JSON.stringify(result, null, 2));
                alert('Survey package failed. Check browser console.');
                return;
            }

            alert('Site package surveyed.');

            setSelectedObject(null);

            await loadSites();
            await loadZones();
            await loadDroneports();
            await loadRoutes();
        } catch (error) {
            console.error('Survey package failed:', error);
            alert('Survey package failed. Check browser console.');
        }
    }

    async function expireSelectedSitePackage() {
        if (!selectedObject || selectedObject.type !== 'site') {
            alert('Select a site first.');
            return;
        }

        const siteId = selectedObject.data.site_id;

        try {
            const response = await fetch(
                `${API_BASE_URL}/governance/overlays/${siteId}/expire-survey-package`,
                {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Expire package error:', JSON.stringify(result, null, 2));
                alert('Expire package failed. Check browser console.');
                return;
            }

            alert('Site package expired.');

            setSelectedObject(null);

            await loadSites();
            await loadZones();
            await loadDroneports();
            await loadRoutes();
        } catch (error) {
            console.error('Expire package failed:', error);
            alert('Expire package failed. Check browser console.');
        }
    }

    async function deactivateSelectedObject() {
        if (!selectedObject) {
            alert('Select an object first.');
            return;
        }

        if (selectedObject.type === 'site') {
            alert('Use Deactivate Site Package for Sites.');
            return;
        }

        const overlayId = getSelectedOverlayId();
        const overlayType = selectedObject.type;

        try {
            const response = await fetch(
                `${API_BASE_URL}/governance/overlays/${overlayType}s/${overlayId}/deactivate`,
                {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Deactivate error:', JSON.stringify(result, null, 2));
                alert('Deactivate failed. Check browser console.');
                return;
            }

            alert('Overlay deactivated.');

            setSelectedObject(null);

            if (selectedObject.type === 'zone') await loadZones();
            if (selectedObject.type === 'droneport') await loadDroneports();
            if (selectedObject.type === 'route') await loadRoutes();
        } catch (error) {
            console.error('Deactivate failed:', error);
            alert('Deactivate failed. Check browser console.');
        }
    }

    async function deactivateSelectedSitePackage() {
        if (!selectedObject || selectedObject.type !== 'site') {
            alert('Select a site first.');
            return;
        }

        const siteId = selectedObject.data.site_id;

        try {
            const response = await fetch(
                `${API_BASE_URL}/governance/overlays/sites/${siteId}/deactivate-package`,
                {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('Deactivate package error:', JSON.stringify(result, null, 2));
                alert('Deactivate package failed. Check browser console.');
                return;
            }

            alert('Site package deactivated.');

            setSelectedObject(null);

            await loadSites();
            await loadZones();
            await loadDroneports();
            await loadRoutes();
        } catch (error) {
            console.error('Deactivate package failed:', error);
            alert('Deactivate package failed. Check browser console.');
        }
    }

    function getLandingSpaceEditorPosition(landingSpace = selectedObject?.data) {

        const droneport = savedDroneports.find(
            (item) =>
                item.droneport_id === landingSpace.droneport_id
        );

        if (
            !droneport?.geometry?.coordinates ||
            !landingSpace?.geometry?.coordinates
        ) {
            return null;
        }

        const droneportLongitude = droneport.geometry.coordinates[0];
        const droneportLatitude = droneport.geometry.coordinates[1];

        const landingLongitude = landingSpace.geometry.coordinates[0];
        const landingLatitude = landingSpace.geometry.coordinates[1];

        const feetPerDegreeLatitude = 364000;

        const feetPerDegreeLongitude =
            feetPerDegreeLatitude *
            Math.cos(droneportLatitude * Math.PI / 180);

        const eastFeet =
            (landingLongitude - droneportLongitude) *
            feetPerDegreeLongitude;

        const northFeet =
            (landingLatitude - droneportLatitude) *
            feetPerDegreeLatitude;

        const diameterFeet =
            droneport.droneport_diameter_ft ?? 30;

        const pixelsPerFoot = 300 / diameterFeet;

        return {
            x: 150 + eastFeet * pixelsPerFoot,
            y: 150 - northFeet * pixelsPerFoot,
        };
    }

    async function saveLandingSpaceEditorPosition() {
        if (
            !selectedObject ||
            selectedObject.type !== 'landing_space' ||
            !landingSpaceEditorPosition
        ) {
            return;
        }

        const landingSpace = selectedObject.data;

        const droneport = savedDroneports.find(
            (item) =>
                item.droneport_id === landingSpace.droneport_id
        );

        if (!droneport?.geometry?.coordinates) {
            return;
        }

        const droneportLongitude = droneport.geometry.coordinates[0];
        const droneportLatitude = droneport.geometry.coordinates[1];

        const diameterFeet =
            droneport.droneport_diameter_ft ?? 30;

        const pixelsPerFoot = 300 / diameterFeet;

        const eastFeet =
            (landingSpaceEditorPosition.x - 150) /
            pixelsPerFoot;

        const northFeet =
            (150 - landingSpaceEditorPosition.y) /
            pixelsPerFoot;

        const feetPerDegreeLatitude = 364000;

        const feetPerDegreeLongitude =
            feetPerDegreeLatitude *
            Math.cos(droneportLatitude * Math.PI / 180);

        const latitude =
            droneportLatitude +
            northFeet / feetPerDegreeLatitude;

        const longitude =
            droneportLongitude +
            eastFeet / feetPerDegreeLongitude;

        const payload = {
            geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
        };

        try {
            const response = await fetch(
                `${API_BASE_URL}/droneport-landing-spaces/${landingSpace.landing_space_id}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error(
                    'Update landing space location error:',
                    JSON.stringify(result, null, 2)
                );
                alert('Failed to update landing space location.');
                return;
            }

            await loadLandingSpaces(
                landingSpace.droneport_id
            );

            setSelectedObject({
                type: 'landing_space',
                data: result,
            });

            setShowLandingSpaceEditor(false);

            console.log(
                'Updated landing space location:',
                result
            );
        } catch (error) {
            console.error(
                'Update landing space location failed:',
                error
            );
            alert(
                'Update landing space location failed. Check browser console.'
            );
        }
    }

    async function createLandingSpaceFromEditor() {
        if (
            !selectedObject ||
            selectedObject.type !== 'droneport' ||
            !landingSpaceEditorPosition
        ) {
            return;
        }

        const droneport = selectedObject.data;

        if (!droneport?.geometry?.coordinates) {
            return;
        }

        const droneportLongitude = droneport.geometry.coordinates[0];
        const droneportLatitude = droneport.geometry.coordinates[1];

        const diameterFeet =
            droneport.droneport_diameter_ft ?? 30;

        const pixelsPerFoot = 300 / diameterFeet;

        const eastFeet =
            (landingSpaceEditorPosition.x - 150) /
            pixelsPerFoot;

        const northFeet =
            (150 - landingSpaceEditorPosition.y) /
            pixelsPerFoot;

        const feetPerDegreeLatitude = 364000;

        const feetPerDegreeLongitude =
            feetPerDegreeLatitude *
            Math.cos(droneportLatitude * Math.PI / 180);

        const latitude =
            droneportLatitude +
            northFeet / feetPerDegreeLatitude;

        const longitude =
            droneportLongitude +
            eastFeet / feetPerDegreeLongitude;

        const payload = {
            droneport_id: droneport.droneport_id,
            geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            created_by: 'dronenav',
        };

        try {
            const response = await fetch(
                `${API_BASE_URL}/droneport-landing-spaces`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error(
                    'Create landing space error:',
                    JSON.stringify(result, null, 2)
                );
                alert('Failed to create landing space.');
                return;
            }

            await loadLandingSpaces(droneport.droneport_id);

            setAddingLandingSpace(false);
            setShowLandingSpaceEditor(false);

            console.log('Created landing space:', result);
        } catch (error) {
            console.error(
                'Create landing space failed:',
                error
            );
            alert(
                'Create landing space failed. Check browser console.'
            );
        }
    }

    let routeEndpointSnapTarget = null;

    if (
        mapMode === 'create_route' &&
        mousePosition
    ) {
        routeEndpointSnapTarget =
            findRouteEndpointSnapTarget(
                mousePosition,
                savedRoutes,
                ROUTE_ENDPOINT_SNAP_DISTANCE_FT
            ) ||
            findDroneportSnapTarget(
                mousePosition,
                savedDroneports,
                ROUTE_ENDPOINT_SNAP_DISTANCE_FT
            );
    } else if (
        mapMode === 'create_droneport' &&
        mousePosition
    ) {
        routeEndpointSnapTarget =
            findRouteEndpointSnapTarget(
                mousePosition,
                savedRoutes,
                ROUTE_ENDPOINT_SNAP_DISTANCE_FT
            );
    }

    let nextRouteInteriorAngleDegrees = null;

    if (
        mapMode === 'create_route' &&
        points.length >= 2 &&
        mousePosition
    ) {
        const firstPoint = points[points.length - 2];
        const vertexPoint = points[points.length - 1];

        nextRouteInteriorAngleDegrees = calculateInteriorAngleDegrees(
            firstPoint,
            vertexPoint,
            mousePosition
        );
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: isReadOnly ? '1fr' : '360px 1fr',
                height: '100vh',
                overflow: 'hidden',
            }}
        >
            {!isReadOnly && (
                <div
                    style={{
                        padding: '10px',
                        overflowY: 'auto',
                        borderRight: '1px solid #ccc',
                    }}
                >

                    {!isReadOnly && (
                        <div style={{ padding: '10px' }}>

                            <h3>Map Mode</h3>

                            <select
                                value={mapMode}
                                onChange={(e) => {
                                    setMapMode(e.target.value);
                                    clearPoints();
                                    setSelectedObject(null);
                                }}
                            >
                                <option value="view">View</option>
                                <option value="create_site">Create Site</option>
                                <option value="create_zone">Create Zone</option>
                                <option value="create_droneport">Create DronePort</option>
                                <option value="create_route">Create Route</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                            </select>

                            <span style={{ marginLeft: '20px' }}>
                                <strong>{pointLabel}:</strong> {points.length}
                            </span>

                            <button onClick={undoLastPoint} style={{ marginLeft: '10px' }}>
                                Undo Last Point
                            </button>

                            <button onClick={clearPoints} style={{ marginLeft: '10px' }}>
                                Clear Points
                            </button>

                            <button onClick={() => setMapCenter(currentCenter)} style={{ marginLeft: '10px' }}>
                                Set Home Center
                            </button>

                            <button onClick={loadSites} style={{ marginLeft: '10px' }}>
                                Load Sites
                            </button>

                            <button onClick={loadZones} style={{ marginLeft: '10px' }}>
                                Load Zones
                            </button>

                            <button onClick={loadObstacles} style={{ marginLeft: '10px' }}>
                                Load Obstacles
                            </button>

                            <button onClick={loadDroneports} style={{ marginLeft: '10px' }}>
                                Load DronePorts
                            </button>

                            <button onClick={loadRoutes} style={{ marginLeft: '10px' }}>
                                Load Routes
                            </button>

                            {mapMode === 'create_site' && (
                                <>
                                    <h3>Create Site</h3>

                                    <label>
                                        Site Name:{' '}
                                        <input
                                            type="text"
                                            placeholder="Site Name"
                                            value={siteName}
                                            onChange={(e) => setSiteName(e.target.value)}
                                        />
                                    </label>

                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={siteDescription}
                                        onChange={(e) => setSiteDescription(e.target.value)}
                                    />

                                    <select value={siteType} onChange={(e) => setSiteType(e.target.value)}>
                                        {Object.entries(referenceData?.site_type || {}).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <button onClick={saveSite} style={{ marginLeft: '10px' }}>
                                        Save Site
                                    </button>
                                </>
                            )}

                            {mapMode === 'create_zone' && (
                                <>
                                    <h3>Create Zone</h3>

                                    <select
                                        value={selectedSiteId}
                                        onChange={(e) => setSelectedSiteId(e.target.value)}
                                    >
                                        <option value="">Select Site</option>
                                        {savedSites.map((site) => (
                                            <option key={site.site_id} value={site.site_id}>
                                                {site.site_name}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="text"
                                        placeholder="Zone Name"
                                        value={zoneName}
                                        onChange={(e) => setZoneName(e.target.value)}
                                    />

                                    <select value={zoneType} onChange={(e) => setZoneType(e.target.value)}>
                                        {Object.entries(referenceData?.zone_type || {}).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <button onClick={saveZone} style={{ marginLeft: '10px' }}>
                                        Save Zone
                                    </button>
                                </>
                            )}

                            {mapMode === 'create_droneport' && (
                                <>
                                    <h3>Create DronePort</h3>

                                    <select
                                        value={selectedSiteId}
                                        onChange={(e) => setSelectedSiteId(e.target.value)}
                                    >
                                        <option value="">Select Site</option>
                                        {savedSites.map((site) => (
                                            <option key={site.site_id} value={site.site_id}>
                                                {site.site_name}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="text"
                                        placeholder="DronePort Name"
                                        value={droneportName}
                                        onChange={(e) => setDroneportName(e.target.value)}
                                    />

                                    <select value={droneportType} onChange={(e) => setDroneportType(e.target.value)}>
                                        {Object.entries(referenceData?.droneport_type || {}).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="Diameter ft"
                                        value={droneportDiameter}
                                        onChange={(e) => setDroneportDiameter(Number(e.target.value))}
                                    />

                                    <button onClick={saveDroneport} style={{ marginLeft: '10px' }}>
                                        Save DronePort
                                    </button>
                                </>
                            )}

                            {mapMode === 'create_route' && (
                                <>
                                    <h3>Create Route</h3>

                                    <label>
                                        Route Name:{' '}
                                        <input
                                            type="text"
                                            placeholder="Route Name"
                                            value={routeName}
                                            onChange={(e) => setRouteName(e.target.value)}
                                        />
                                    </label>

                                    <br />

                                    <label>
                                        Route Type:{' '}
                                        <select value={routeType} onChange={(e) => setRouteType(e.target.value)}>
                                            {Object.entries(referenceData?.route_type || {}).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <br />

                                    <label>
                                        Minimum Aircraft Weight lbs:{' '}
                                        <input
                                            type="number"
                                            placeholder="4"
                                            value={minimumAircraftWeight}
                                            onChange={(e) => setMinimumAircraftWeight(Number(e.target.value))}
                                        />
                                    </label>

                                    <br />

                                    <label>
                                        Maximum Aircraft Weight lbs:{' '}
                                        <input
                                            type="number"
                                            placeholder="50"
                                            value={maximumAircraftWeight}
                                            onChange={(e) => setMaximumAircraftWeight(Number(e.target.value))}
                                        />
                                    </label>

                                    <br />

                                    <label>
                                        Route Direction:{' '}
                                        <select
                                            value={routeDirection}
                                            onChange={(e) => setRouteDirection(e.target.value)}
                                        >
                                            <option value="2">Bi-directional</option>
                                            <option value="0">One-way</option>
                                            <option value="1">Reverse</option>
                                        </select>
                                    </label>

                                    <br />

                                    <label>
                                        Maximum Aircraft Capacity:{' '}
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={routeBuffering}
                                            onChange={(e) => setRouteBuffering(Number(e.target.value))}
                                        />
                                    </label>

                                    <br />

                                    <button onClick={saveRoute} style={{ marginLeft: '10px' }}>
                                        Save Route
                                    </button>
                                </>
                            )}

                            {mapMode === 'update' && selectedObject && selectedObject.type === 'site' && (
                                <>
                                    <h3>Update Site Attributes</h3>

                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={siteDescription}
                                        onChange={(e) => setSiteDescription(e.target.value)}
                                    />

                                    <input
                                        type="number"
                                        placeholder="Minimum altitude: (ft)"
                                        value={minimumAltitude}
                                        onChange={(e) => setMinimumAltitude(Number(e.target.value))}
                                    />

                                    <input
                                        type="number"
                                        placeholder="Maximum altitude: (ft)"
                                        value={maximumAltitude}
                                        onChange={(e) => setMaximumAltitude(Number(e.target.value))}
                                    />

                                    <button onClick={updateSelectedSite} style={{ marginLeft: '10px' }}>
                                        Update Site Attributes
                                    </button>
                                </>
                            )}

                            {mapMode === 'update' && selectedObject && selectedObject.type === 'zone' && (
                                <>
                                    <h3>Update Zone Attributes</h3>

                                    <input
                                        type="text"
                                        placeholder="New zone name"
                                        value={zoneName}
                                        onChange={(e) => setZoneName(e.target.value)}
                                    />

                                    <select value={zoneType} onChange={(e) => setZoneType(e.target.value)}>
                                        {Object.entries(referenceData?.zone_type || {}).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="Minimum altitude: (ft)"
                                        value={minimumAltitude}
                                        onChange={(e) => setMinimumAltitude(Number(e.target.value))}
                                    />

                                    <input
                                        type="number"
                                        placeholder="Maximum altitude: (ft)"
                                        value={maximumAltitude}
                                        onChange={(e) => setMaximumAltitude(Number(e.target.value))}
                                    />

                                    <button onClick={updateSelectedZone} style={{ marginLeft: '10px' }}>
                                        Update Zone Attributes
                                    </button>
                                </>
                            )}

                            {mapMode === 'update' && selectedObject && selectedObject.type === 'droneport' && (
                                <>
                                    <h3>Update DronePort Attributes</h3>

                                    <input
                                        type="text"
                                        placeholder="New droneport name"
                                        value={droneportName}
                                        onChange={(e) => setDroneportName(e.target.value)}
                                    />

                                    <select value={droneportType} onChange={(e) => setDroneportType(e.target.value)}>
                                        {Object.entries(referenceData?.droneport_type || {}).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="Droneport diameter (ft):"
                                        value={droneportDiameter}
                                        onChange={(e) => setDroneportDiameter(Number(e.target.value))}
                                    />

                                    <button onClick={updateSelectedDroneport} style={{ marginLeft: '10px' }}>
                                        Update DronePort Attributes
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAddingLandingSpace(true);
                                            setLandingSpaceEditorPosition({
                                                x: 150,
                                                y: 150,
                                            });
                                            setShowLandingSpaceEditor(true);
                                        }}
                                        style={{ marginLeft: '10px' }}
                                    >
                                        Add Landing Space
                                    </button>
                                </>
                            )}

                            {mapMode === 'update' &&
                                selectedObject &&
                                selectedObject.type === 'landing_space' && (
                                    <>
                                        <h3>Update Landing Space</h3>

                                        <label>
                                            Heading (degrees):{' '}
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            max="359"
                                            step="1"
                                            placeholder="Heading (degrees)"
                                            value={landingSpaceHeading}
                                            onChange={(e) =>
                                                setLandingSpaceHeading(Number(e.target.value))
                                            }
                                        />

                                        <label
                                            style={{
                                                marginLeft: '10px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={landingSpaceCharging}
                                                onChange={(e) =>
                                                    setLandingSpaceCharging(e.target.checked)
                                                }
                                            />
                                            Charging Capable
                                        </label>

                                        <select
                                            value={landingSpaceStatus}
                                            onChange={(e) =>
                                                setLandingSpaceStatus(e.target.value)
                                            }
                                            style={{ marginLeft: '10px' }}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>

                                        <button
                                            onClick={updateSelectedLandingSpace}
                                            style={{ marginLeft: '10px' }}
                                        >
                                            Update Landing Space
                                        </button>

                                        <button
                                            onClick={() => {
                                                setAddingLandingSpace(false);

                                                setLandingSpaceEditorPosition(
                                                    getLandingSpaceEditorPosition()
                                                );

                                                setShowLandingSpaceEditor(true);
                                            }}
                                            style={{ marginLeft: '10px' }}
                                        >
                                            Change Location
                                        </button>
                                    </>
                                )
                            }

                            {mapMode === 'update' && selectedObject && selectedObject.type === 'route' && (
                                <>
                                    <h3>Update Route Attributes</h3>

                                    <label>
                                        Route Name:{' '}
                                        <input
                                            type="text"
                                            placeholder="Route Name"
                                            value={routeName}
                                            onChange={(e) => setRouteName(e.target.value)}
                                        />
                                    </label>

                                    <br />

                                    <label>
                                        Route Type:{' '}
                                        <select value={routeType} onChange={(e) => setRouteType(e.target.value)}>
                                            {Object.entries(referenceData?.route_type || {}).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <br />

                                    <label>
                                        Maximum Aircraft Capacity:{' '}
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={routeBuffering}
                                            onChange={(e) => setRouteBuffering(Number(e.target.value))}
                                        />
                                    </label>

                                    <br />

                                    <label>
                                        Minimum Aircraft Weight lbs:{' '}
                                        <input
                                            type="number"
                                            placeholder="4"
                                            value={minimumAircraftWeight}
                                            onChange={(e) => setMinimumAircraftWeight(Number(e.target.value))}
                                        />
                                    </label>

                                    <br />

                                    <label>
                                        Maximum Aircraft Weight lbs:{' '}
                                        <input
                                            type="number"
                                            placeholder="50"
                                            value={maximumAircraftWeight}
                                            onChange={(e) => setMaximumAircraftWeight(Number(e.target.value))}
                                        />
                                    </label>

                                    <br />

                                    {editableRouteSegmentAttributes.length > 0 && (
                                        <div style={{ marginTop: '15px' }}>
                                            <h4>Route Segment Attributes</h4>

                                            {editableRouteSegmentAttributes.map((segment, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        border: '1px solid #ccc',
                                                        padding: '8px',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    <strong>
                                                        {getRouteSegmentLabel(index, editableRouteSegmentAttributes.length)}
                                                    </strong>

                                                    <br />

                                                    <label>
                                                        Width ft:{' '}
                                                        <input
                                                            type="number"
                                                            value={segment.route_width_ft}
                                                            onChange={(e) =>
                                                                updateEditableRouteSegmentAttribute(
                                                                    index,
                                                                    'route_width_ft',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <br />

                                                    <label>
                                                        Min AGL ft:{' '}
                                                        <input
                                                            type="number"
                                                            value={segment.minimum_altitude_ft}
                                                            onChange={(e) =>
                                                                updateEditableRouteSegmentAttribute(
                                                                    index,
                                                                    'minimum_altitude_ft',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <br />

                                                    <label>
                                                        Max AGL ft:{' '}
                                                        <input
                                                            type="number"
                                                            value={segment.maximum_altitude_ft}
                                                            onChange={(e) =>
                                                                updateEditableRouteSegmentAttribute(
                                                                    index,
                                                                    'maximum_altitude_ft',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <br />

                                                    <label>
                                                        Speed mph:{' '}
                                                        <input
                                                            type="number"
                                                            value={segment.speed_limit_mph}
                                                            onChange={(e) =>
                                                                updateEditableRouteSegmentAttribute(
                                                                    index,
                                                                    'speed_limit_mph',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button onClick={updateSelectedRoute} style={{ marginLeft: '10px' }}>
                                        Update Route Attributes
                                    </button>
                                </>
                            )}

                        </div>
                    )}

                    {!isReadOnly && mapMode === 'create_site' && sitePayload && (
                        <div style={{ padding: '10px' }}>
                            <h3>Site Payload Preview</h3>
                            <pre>{JSON.stringify(sitePayload, null, 2)}</pre>
                        </div>
                    )}

                    {!isReadOnly && mapMode === 'create_zone' && zonePayload && (
                        <div style={{ padding: '10px' }}>
                            <h3>Zone Payload Preview</h3>
                            <pre>{JSON.stringify(zonePayload, null, 2)}</pre>
                        </div>
                    )}

                    {!isReadOnly && mapMode === 'create_droneport' && droneportPayload && (
                        <div style={{ padding: '10px' }}>
                            <h3>DronePort Payload Preview</h3>
                            <pre>{JSON.stringify(droneportPayload, null, 2)}</pre>
                        </div>
                    )}

                    {!isReadOnly && mapMode === 'create_route' && routePayload && (
                        <div style={{ padding: '10px' }}>
                            <h3>Route Payload Preview</h3>
                            <pre>{JSON.stringify(routePayload, null, 2)}</pre>
                        </div>
                    )}


                    {!isReadOnly && selectedObject && (
                        <div style={{ padding: '10px' }}>
                            <h3>Selected Object</h3>

                            <button
                                onClick={() => setSelectedObject(null)}
                                style={{ marginBottom: '10px' }}
                            >
                                Clear Selection
                            </button>

                            {mapMode === 'delete' && (
                                <button
                                    onClick={deleteSelectedObject}
                                    style={{ marginLeft: '10px', marginBottom: '10px' }}
                                >
                                    Delete Selected
                                </button>
                            )}

                            {mapMode === 'update' && selectedObject.type !== 'site' && (
                                <>
                                    <button
                                        onClick={surveySelectedObject}
                                        style={{ marginLeft: '10px', marginBottom: '10px' }}
                                    >
                                        Mark Surveyed
                                    </button>

                                    <button
                                        onClick={expireSurveySelectedObject}
                                        style={{ marginLeft: '10px', marginBottom: '10px' }}
                                    >
                                        Expire Survey
                                    </button>

                                    <button
                                        onClick={deactivateSelectedObject}
                                        style={{ marginLeft: '10px', marginBottom: '10px' }}
                                    >
                                        Deactivate Overlay
                                    </button>
                                </>
                            )}

                            {mapMode === 'update' && selectedObject.type === 'site' && (
                                <>
                                    <button
                                        onClick={surveySelectedSitePackage}
                                        style={{ marginLeft: '10px', marginBottom: '10px' }}
                                    >
                                        Mark Site Package Surveyed
                                    </button>

                                    <button
                                        onClick={expireSelectedSitePackage}
                                        style={{ marginLeft: '10px', marginBottom: '10px' }}
                                    >
                                        Expire Site Package Survey
                                    </button>

                                    <button
                                        onClick={deactivateSelectedSitePackage}
                                        style={{ marginLeft: '10px', marginBottom: '10px' }}
                                    >
                                        Deactivate Site Package
                                    </button>
                                </>
                            )}

                            <pre>{JSON.stringify(selectedObject, null, 2)}</pre>
                        </div>
                    )}

                    {mapMode === 'create_route' && points.length >= 2 && (
                        <div style={{ padding: '10px' }}>
                            Turn angle:{' '}
                            {nextRouteInteriorAngleDegrees === null
                                ? 'Move mouse to preview'
                                : `${nextRouteInteriorAngleDegrees.toFixed(0)}°`}
                            {nextRouteInteriorAngleDegrees !== null && (
                                <>
                                    {' '}
                                    {nextRouteInteriorAngleDegrees >= MIN_ROUTE_INTERIOR_ANGLE_DEGREES
                                        ? '✓'
                                        : `(minimum ${MIN_ROUTE_INTERIOR_ANGLE_DEGREES}°)`}
                                </>
                            )}
                        </div>
                    )}

                    {!isReadOnly && (
                        <div style={{ padding: '10px' }}>
                            Current Center: {currentCenter[0].toFixed(6)},{' '}
                            {currentCenter[1].toFixed(6)}
                        </div>
                    )}
                </div>
            )}

            <div style={{ height: '100vh', width: '100%' }}>

                <MapContainer
                    center={mapCenter}
                    zoom={DEFAULT_MAP_ZOOM}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution={MAP_TILE_ATTRIBUTION}
                        url={MAP_TILE_URL}
                    />

                    {isMapContextMode && (
                        <MapContextBounds bounds={mapContextData?.bounds} />
                    )}

                    <Pane name="sitesPane" style={{ zIndex: 400 }} />
                    <Pane name="zonesPane" style={{ zIndex: 410 }} />
                    <Pane name="obstaclesPane" style={{ zIndex: 415 }} />
                    <Pane name="routesPane" style={{ zIndex: 420 }} />
                    <Pane name="droneportsPane" style={{ zIndex: 430 }} />
                    <Pane name="editPane" style={{ zIndex: 500 }} />

                    <MapClickHandler onMapClick={handleMapClick} />
                    <MapPositionTracker onMove={setCurrentCenter} />
                    <MapZoomDebug />
                    <MapMouseTracker onMove={setMousePosition} />

                    {points.map((point, index) => (
                        <CircleMarker
                            pane="editPane"
                            key={index}
                            center={[point.lat, point.lng]}
                            radius={4}
                            pathOptions={{
                                color: '#3388ff',
                                fillColor: '#3388ff',
                                fillOpacity: 1,
                                weight: 1,
                            }}
                        >
                            <Popup>
                                Boundary Point {index + 1}
                                <br />
                                Lat: {point.lat.toFixed(6)}
                                <br />
                                Lng: {point.lng.toFixed(6)}
                            </Popup>
                        </CircleMarker>
                    ))}

                    {(mapMode === 'create_site' || mapMode === 'create_zone') && points.length >= 3 && (
                        <Polygon pane="editPane" positions={polygonPositions} />
                    )}

                    {mapMode === 'create_route' && points.length >= 4 && (
                        <Polyline pane="editPane" positions={polylinePositions} />
                    )}

                    {mapMode === 'create_droneport' && points.length === 1 && (
                        <Circle
                            pane="editPane"
                            center={[points[0].lat, points[0].lng]}
                            radius={(droneportDiameter / 2) * 0.3048}
                            pathOptions={{
                                color: 'purple',
                                weight: 3,
                                fillOpacity: 0.15,
                            }}
                        />
                    )}

                    {savedSites
                        .filter(
                            (site) =>
                                site.geometry &&
                                site.geometry.type === 'Polygon' &&
                                Array.isArray(site.geometry.coordinates) &&
                                Array.isArray(site.geometry.coordinates[0]) &&
                                site.geometry.coordinates[0].length >= 4
                        )
                        .map((site) => {
                            const selectedSurveySite = isSelectedSurveyOverlay('site', site);
                            const deEmphasizedSurveySite = isSurveyReadOnly && !selectedSurveySite;

                            const selectedMapContextSite = isMapContextMode && selectedMapContextSiteIds.has(site.site_id);
                            const deEmphasizedMapContextSite = isMapContextMode && !selectedMapContextSite;

                            return (
                                <Polygon
                                    pane="sitesPane"
                                    key={`${site.site_id}-${mapMode}`}
                                    positions={site.geometry.coordinates[0].map((coordinate) => [
                                        coordinate[1],
                                        coordinate[0],
                                    ])}
                                    pathOptions={{
                                        color: 'gray',
                                        weight: selectedSurveySite || selectedMapContextSite ? 5 : 3,
                                        opacity: deEmphasizedSurveySite || deEmphasizedMapContextSite ? 0.6 : 0.8,
                                        fillOpacity: deEmphasizedSurveySite || deEmphasizedMapContextSite ? 0.08 : 0.15,
                                        dashArray: site.operational_status === 'active' ? null : '4, 8',
                                    }}
                                    bubblingMouseEvents={false}
                                    interactive={
                                        mapMode === 'view' ||
                                        mapMode === 'update' ||
                                        mapMode === 'delete'
                                    }
                                    eventHandlers={{
                                        click: () => {
                                            if (mapMode === 'update' || mapMode === 'delete') {
                                                setSelectedObject({
                                                    type: 'site',
                                                    data: site,
                                                });

                                                if (mapMode === 'update') {
                                                    setSiteDescription(site.description || '');
                                                    setMinimumAltitude(site.minimum_altitude_ft ?? 0);
                                                    setMaximumAltitude(site.maximum_altitude_ft ?? 400);
                                                }
                                            }
                                        },
                                    }}
                                >
                                    {mapMode === 'view' && (
                                        <Popup>
                                            <strong>{site.site_name}</strong>
                                            <br />
                                            Type: {site.site_type}
                                            <br />
                                            Status: {site.operational_status}
                                            <br />
                                            Survey: {site.survey_status}
                                            <br />
                                            Authority ID: {site.authority_id}
                                            <br />
                                            Site ID: {site.site_id}
                                            <br />
                                            Created by: {site.created_by}
                                            <br />
                                            Description: {site.description}
                                        </Popup>
                                    )}
                                </Polygon>
                            );
                        })
                    }

                    {savedZones
                        .filter(
                            (zone) =>
                                zone.geometry &&
                                zone.geometry.type === 'Polygon' &&
                                Array.isArray(zone.geometry.coordinates) &&
                                Array.isArray(zone.geometry.coordinates[0]) &&
                                zone.geometry.coordinates[0].length >= 4
                        )
                        .map((zone) => {
                            const selectedSurveyZone = isSelectedSurveyOverlay('zone', zone);
                            const deEmphasizedSurveyZone = isSurveyReadOnly && !selectedSurveyZone;

                            const selectedMapContextZone = isMapContextMode && selectedMapContextZoneIds.has(zone.zone_id);
                            const deEmphasizedMapContextZone = isMapContextMode && !selectedMapContextZone;

                            return (
                                <Polygon
                                    pane="zonesPane"
                                    key={`${zone.zone_id}-${mapMode}`}
                                    positions={zone.geometry.coordinates[0].map((coordinate) => [
                                        coordinate[1],
                                        coordinate[0],
                                    ])}
                                    pathOptions={{
                                        color: deEmphasizedSurveyZone || deEmphasizedMapContextZone ? 'gray' : 'red',
                                        weight: selectedSurveyZone || selectedMapContextZone ? 5 : 3,
                                        opacity: deEmphasizedSurveyZone || deEmphasizedMapContextZone ? 0.45 : 0.8,
                                        fillOpacity: deEmphasizedSurveyZone || deEmphasizedMapContextZone ? 0.06 : zone.zone_type === 'inclusion' ? 0.0 : 0.15,
                                        dashArray: zone.operational_status === 'active' ? null : '4, 8',
                                    }}
                                    bubblingMouseEvents={false}
                                    interactive={
                                        mapMode === 'view' ||
                                        mapMode === 'update' ||
                                        mapMode === 'delete'
                                    }
                                    eventHandlers={{
                                        click: () => {
                                            if (mapMode === 'update' || mapMode === 'delete') {
                                                setSelectedObject({
                                                    type: 'zone',
                                                    data: zone,
                                                });

                                                if (mapMode === 'update') {
                                                    setZoneName(zone.zone_name);
                                                    setZoneType(zone.zone_type);
                                                    setMinimumAltitude(zone.minimum_altitude_ft ?? 0);
                                                    setMaximumAltitude(zone.maximum_altitude_ft ?? 400);
                                                }
                                            }
                                        },
                                    }}
                                >
                                    {mapMode === 'view' && (
                                        <Popup>
                                            <strong>{zone.zone_name}</strong>
                                            <br />
                                            Type: {zone.zone_type}
                                            <br />
                                            Status: {zone.operational_status}
                                            <br />
                                            Survey: {zone.survey_status}
                                            <br />
                                            Site ID: {zone.site_id}
                                            <br />
                                            Zone ID: {zone.zone_id}
                                            <br />
                                            Created by: {zone.created_by}
                                        </Popup>
                                    )}
                                </Polygon>
                            );
                        })
                    }

                    {savedObstacles
                        .filter(
                            (obstacle) =>
                                obstacle.geometry &&
                                obstacle.geometry.type === 'Point' &&
                                Array.isArray(obstacle.geometry.coordinates)
                        )
                        .map((obstacle) => (
                            <CircleMarker
                                pane="obstaclesPane"
                                key={`${obstacle.obstacle_id}-${mapMode}`}
                                center={[
                                    obstacle.geometry.coordinates[1],
                                    obstacle.geometry.coordinates[0],
                                ]}
                                radius={6}
                                pathOptions={{
                                    color: 'goldenrod',
                                    fillColor: 'yellow',
                                    weight: 2,
                                    opacity: 0.9,
                                    fillOpacity: 0.7,
                                    dashArray:
                                        obstacle.operational_status === 'active'
                                            ? null
                                            : '4, 8',
                                }}
                            >
                                <Popup>
                                    <strong>{obstacle.obstacle_name}</strong>
                                    <br />
                                    Type: {obstacle.obstacle_type}
                                    <br />
                                    Height: {obstacle.maximum_height_agl_ft} ft AGL
                                    <br />
                                    Status: {obstacle.operational_status}
                                    <br />
                                    Survey: {obstacle.survey_status}
                                    <br />
                                    Obstacle ID: {obstacle.obstacle_id}
                                </Popup>
                            </CircleMarker>
                        ))
                    }

                    {savedObstacles
                        .filter(
                            (obstacle) =>
                                obstacle.geometry &&
                                obstacle.geometry.type === 'LineString' &&
                                Array.isArray(obstacle.geometry.coordinates) &&
                                obstacle.geometry.coordinates.length >= 2
                        )
                        .map((obstacle) => (
                            <Polyline
                                pane="obstaclesPane"
                                key={`${obstacle.obstacle_id}-${mapMode}`}
                                positions={obstacle.geometry.coordinates.map((coordinate) => [
                                    coordinate[1],
                                    coordinate[0],
                                ])}
                                pathOptions={{
                                    color: 'goldenrod',
                                    weight: 3,
                                    opacity: 0.9,
                                    dashArray:
                                        obstacle.operational_status === 'active'
                                            ? null
                                            : '4, 8',
                                }}
                            >
                                <Popup>
                                    <strong>{obstacle.obstacle_name}</strong>
                                    <br />
                                    Type: {obstacle.obstacle_type}
                                    <br />
                                    Height: {obstacle.maximum_height_agl_ft} ft AGL
                                    <br />
                                    Status: {obstacle.operational_status}
                                    <br />
                                    Survey: {obstacle.survey_status}
                                    <br />
                                    Obstacle ID: {obstacle.obstacle_id}
                                </Popup>
                            </Polyline>
                        ))
                    }

                    {savedObstacles
                        .filter(
                            (obstacle) =>
                                obstacle.geometry &&
                                obstacle.geometry.type === 'LineString' &&
                                Array.isArray(obstacle.geometry.coordinates)
                        )
                        .flatMap((obstacle) =>
                            obstacle.geometry.coordinates.map((coordinate, index) => (
                                <CircleMarker
                                    pane="obstaclesPane"
                                    key={`${obstacle.obstacle_id}-point-${index}`}
                                    center={[
                                        coordinate[1],
                                        coordinate[0],
                                    ]}
                                    radius={5}
                                    pathOptions={{
                                        color: 'goldenrod',
                                        fillColor: 'yellow',
                                        weight: 2,
                                        opacity:
                                            obstacle.operational_status === 'active'
                                                ? 0.9
                                                : 0.5,
                                        fillOpacity:
                                            obstacle.operational_status === 'active'
                                                ? 0.7
                                                : 0.25,
                                    }}
                                />
                            ))
                        )
                    }

                    {savedObstacles
                        .filter(
                            (obstacle) =>
                                obstacle.geometry &&
                                obstacle.geometry.type === 'Polygon' &&
                                Array.isArray(obstacle.geometry.coordinates) &&
                                Array.isArray(obstacle.geometry.coordinates[0]) &&
                                obstacle.geometry.coordinates[0].length >= 4
                        )
                        .map((obstacle) => (
                            <Polygon
                                pane="obstaclesPane"
                                key={`${obstacle.obstacle_id}-${mapMode}`}
                                positions={obstacle.geometry.coordinates[0].map((coordinate) => [
                                    coordinate[1],
                                    coordinate[0],
                                ])}
                                pathOptions={{
                                    color: 'goldenrod',
                                    fillColor: 'yellow',
                                    weight: 2,
                                    opacity: 0.9,
                                    fillOpacity: 0.25,
                                    dashArray:
                                        obstacle.operational_status === 'active'
                                            ? null
                                            : '4, 8',
                                }}
                            >
                                <Popup>
                                    <strong>{obstacle.obstacle_name}</strong>
                                    <br />
                                    Type: {obstacle.obstacle_type}
                                    <br />
                                    Height: {obstacle.maximum_height_agl_ft} ft AGL
                                    <br />
                                    Status: {obstacle.operational_status}
                                    <br />
                                    Survey: {obstacle.survey_status}
                                    <br />
                                    Obstacle ID: {obstacle.obstacle_id}
                                </Popup>
                            </Polygon>
                        ))
                    }

                    {savedDroneports
                        .filter(
                            (droneport) =>
                                droneport.geometry &&
                                droneport.geometry.type === 'Point' &&
                                Array.isArray(droneport.geometry.coordinates)
                        )
                        .map((droneport) => {
                            const selectedSurveyDroneport = isSelectedSurveyOverlay('droneport', droneport);
                            const deEmphasizedSurveyDroneport = isSurveyReadOnly && !selectedSurveyDroneport;

                            const selectedMapContextDroneport = isMapContextMode && selectedMapContextDroneportIds.has(droneport.droneport_id);
                            const deEmphasizedMapContextDroneport = isMapContextMode && !selectedMapContextDroneport;

                            return (
                                <Circle
                                    pane="droneportsPane"
                                    key={`${droneport.droneport_id}-${mapMode}`}
                                    center={[
                                        droneport.geometry.coordinates[1],
                                        droneport.geometry.coordinates[0],
                                    ]}
                                    radius={(droneport.droneport_diameter_ft / 2) * 0.3048}
                                    pathOptions={{
                                        color: deEmphasizedSurveyDroneport || deEmphasizedMapContextDroneport ? 'gray' : 'purple',
                                        fillColor: deEmphasizedSurveyDroneport || deEmphasizedMapContextDroneport ? 'gray' : 'purple',
                                        weight: selectedSurveyDroneport || selectedMapContextDroneport ? 5 : 3,
                                        opacity: deEmphasizedSurveyDroneport || deEmphasizedMapContextDroneport ? 0.45 : 0.8,
                                        fillOpacity: deEmphasizedSurveyDroneport || deEmphasizedMapContextDroneport ? 0.10 : 0.15,
                                    }}
                                    bubblingMouseEvents={false}
                                    interactive={
                                        mapMode === 'view' ||
                                        mapMode === 'update' ||
                                        mapMode === 'delete'
                                    }
                                    eventHandlers={{
                                        click: () => {
                                            if (mapMode === 'update' || mapMode === 'delete') {
                                                setSelectedObject({
                                                    type: 'droneport',
                                                    data: droneport,
                                                });

                                                if (mapMode === 'update') {
                                                    setDroneportName(droneport.droneport_name);
                                                    setDroneportType(droneport.droneport_type);
                                                    setDroneportDiameter(droneport.droneport_diameter_ft ?? 30);

                                                    loadLandingSpaces(droneport.droneport_id);
                                                }
                                            }
                                        },
                                    }}
                                >
                                    {mapMode === 'view' && (
                                        <Popup>
                                            <strong>{droneport.droneport_name}</strong>
                                            <br />
                                            Type: {droneport.droneport_type}
                                            <br />
                                            Status: {droneport.operational_status}
                                            <br />
                                            Survey: {droneport.survey_status}
                                            <br />
                                            Site ID: {droneport.site_id}
                                            <br />
                                            Droneport ID: {droneport.droneport_id}
                                            <br />
                                            Location: [{droneport.geometry.coordinates[0]}, {droneport.geometry.coordinates[1]}]
                                            <br />
                                            Diameter: {droneport.droneport_diameter_ft} ft
                                            <br />
                                            Created by: {droneport.created_by}
                                        </Popup>
                                    )}
                                </Circle>
                            );
                        })
                    }

                    {mapMode === 'update' &&
                        (selectedObject?.type === 'droneport' ||
                            selectedObject?.type === 'landing_space') &&
                        landingSpaces
                            .filter(
                                (landingSpace) =>
                                    landingSpace.geometry &&
                                    landingSpace.geometry.type === 'Point' &&
                                    Array.isArray(landingSpace.geometry.coordinates)
                            )
                            .map((landingSpace) => (
                                <Circle
                                    pane="editPane"
                                    key={landingSpace.landing_space_id}
                                    center={[
                                        landingSpace.geometry.coordinates[1],
                                        landingSpace.geometry.coordinates[0],
                                    ]}
                                    radius={0.75}
                                    pathOptions={{
                                        weight: 2,
                                        fillOpacity: 1,
                                    }}
                                    eventHandlers={{
                                        click: () => {
                                            setSelectedObject({
                                                type: 'landing_space',
                                                data: landingSpace,
                                            });

                                            setLandingSpaceHeading(
                                                Number(landingSpace.heading_degrees ?? 0)
                                            );
                                            setLandingSpaceCharging(
                                                Boolean(landingSpace.charging_capable)
                                            );
                                            setLandingSpaceStatus(
                                                landingSpace.operational_status ?? 'active'
                                            );
                                        },
                                    }}                                >
                                    <Popup>
                                        Landing Space
                                        <br />
                                        ID: {landingSpace.landing_space_id}
                                        <br />
                                        Status: {landingSpace.operational_status}
                                        <br />
                                        Heading: {landingSpace.heading_degrees}°
                                        <br />
                                        Charging: {landingSpace.charging_capable ? 'Yes' : 'No'}
                                    </Popup>
                                </Circle>
                            ))
                    }

                    {routeEndpointSnapTarget && (
                        <CircleMarker
                            center={[
                                routeEndpointSnapTarget.lat,
                                routeEndpointSnapTarget.lng,
                            ]}
                            radius={8}
                            pathOptions={{
                                weight: 3,
                                fillOpacity: 0.4,
                            }}
                        />
                    )}

                    {savedRoutes
                        .filter(
                            (route) =>
                                route.geometry &&
                                route.geometry.type === 'LineString' &&
                                Array.isArray(route.geometry.coordinates) &&
                                route.geometry.coordinates.length >= 4
                        )
                        .map((route) => {
                            const routePositions = route.geometry.coordinates.map((coordinate) => [
                                coordinate[1],
                                coordinate[0],
                            ]);

                            const leftRoutePositions = offsetPositions(routePositions, 5);
                            const rightRoutePositions = offsetPositions(routePositions, -5);

                            const selectedSurveyRoute = isSelectedSurveyOverlay('route', route);
                            const deEmphasizedSurveyRoute = isSurveyReadOnly && !selectedSurveyRoute;

                            const selectedMapContextRoute = isMapContextMode && selectedMapContextRouteIds.has(route.route_id);
                            const deEmphasizedMapContextRoute = isMapContextMode && !selectedMapContextRoute;

                            const routePathOptions = {
                                color: deEmphasizedSurveyRoute || deEmphasizedMapContextRoute ? 'gray' : 'green',
                                weight: selectedSurveyRoute || selectedMapContextRoute ? 4 : 2,
                                opacity: deEmphasizedSurveyRoute || deEmphasizedMapContextRoute ? 0.35 : 0.8,
                                dashArray: route.operational_status === 'active' ? null : '4, 8',
                            };

                            const selectRoute = () => {
                                if (mapMode === 'update' || mapMode === 'delete') {
                                    setSelectedObject({
                                        type: 'route',
                                        data: route,
                                    });

                                    if (mapMode === 'update') {
                                        setRouteName(route.route_name);
                                        setRouteType(route.route_type);
                                        setMinimumAircraftWeight(route.minimum_aircraft_weight_lbs ?? 4);
                                        setMaximumAircraftWeight(route.maximum_aircraft_weight_lbs ?? 50);
                                        setRouteBuffering(route.maximum_aircraft_capacity ?? 0);

                                        const existingSegmentAttributes =
                                            Array.isArray(route.segment_attributes) &&
                                                route.segment_attributes.length > 0
                                                ? route.segment_attributes
                                                : buildDefaultSegmentAttributes(
                                                    route.geometry.coordinates.map((coordinate) => ({
                                                        lng: coordinate[0],
                                                        lat: coordinate[1],
                                                    }))
                                                );

                                        setEditableRouteSegmentAttributes(existingSegmentAttributes);
                                    }
                                }
                            };

                            return route.direction === 2 ? (
                                <Fragment key={`${route.route_id}-bidirectional-${mapMode}`}>
                                    <Polyline
                                        pane="routesPane"
                                        key={`${route.route_id}-left-${mapMode}`}
                                        positions={leftRoutePositions}
                                        pathOptions={routePathOptions}
                                        bubblingMouseEvents={false}
                                        interactive={
                                            mapMode === 'view' ||
                                            mapMode === 'update' ||
                                            mapMode === 'delete'
                                        }
                                        eventHandlers={{
                                            click: selectRoute,
                                        }}
                                    >
                                        <RouteArrows
                                            positions={leftRoutePositions}
                                            direction={0}
                                            selected={selectedSurveyRoute}
                                            deEmphasized={deEmphasizedSurveyRoute}
                                        />
                                    </Polyline>

                                    <Polyline
                                        pane="routesPane"
                                        key={`${route.route_id}-right-${mapMode}`}
                                        positions={rightRoutePositions}
                                        pathOptions={routePathOptions}
                                        bubblingMouseEvents={false}
                                        interactive={
                                            mapMode === 'view' ||
                                            mapMode === 'update' ||
                                            mapMode === 'delete'
                                        }
                                        eventHandlers={{
                                            click: selectRoute,
                                        }}
                                    >
                                        <RouteArrows
                                            positions={rightRoutePositions}
                                            direction={1}
                                            selected={selectedSurveyRoute}
                                            deEmphasized={deEmphasizedSurveyRoute}
                                        />
                                    </Polyline>

                                    <Polyline
                                        pane="routesPane"
                                        positions={routePositions}
                                        pathOptions={{
                                            color: 'transparent',
                                            weight: 24,
                                            opacity: 0,
                                        }}
                                        bubblingMouseEvents={false}
                                        interactive={
                                            mapMode === 'view' ||
                                            mapMode === 'update' ||
                                            mapMode === 'delete'
                                        }
                                        eventHandlers={{
                                            click: selectRoute,
                                        }}
                                    >
                                        {mapMode === 'view' && (
                                            <RoutePopup route={route} />
                                        )}
                                    </Polyline>

                                </Fragment>
                            ) : (
                                <Fragment key={`${route.route_id}-single-${mapMode}`}>
                                    <Polyline
                                        pane="routesPane"
                                        key={`${route.route_id}-${mapMode}`}
                                        positions={routePositions}
                                        pathOptions={routePathOptions}
                                        bubblingMouseEvents={false}
                                        interactive={
                                            mapMode === 'view' ||
                                            mapMode === 'update' ||
                                            mapMode === 'delete'
                                        }
                                        eventHandlers={{
                                            click: selectRoute,
                                        }}
                                    >
                                        <RouteArrows
                                            positions={routePositions}
                                            direction={route.direction}
                                            selected={selectedSurveyRoute}
                                            deEmphasized={deEmphasizedSurveyRoute}
                                        />
                                    </Polyline>

                                    <Polyline
                                        pane="routesPane"
                                        positions={routePositions}
                                        pathOptions={{
                                            color: 'transparent',
                                            weight: 20,
                                            opacity: 0,
                                        }}
                                        bubblingMouseEvents={false}
                                        interactive={
                                            mapMode === 'view' ||
                                            mapMode === 'update' ||
                                            mapMode === 'delete'
                                        }
                                        eventHandlers={{
                                            click: selectRoute,
                                        }}
                                    >
                                        {mapMode === 'view' && (
                                            <RoutePopup route={route} />
                                        )}

                                    </Polyline>
                                </Fragment>
                            );
                        })}

                    {actualFlightPositions.length >= 2 && (
                        <Polyline
                            positions={actualFlightPositions}
                            pathOptions={{
                                color: 'orange',
                                weight: 2,
                                opacity: 0.9,
                            }}
                        />
                    )}
                </MapContainer>

                {showLandingSpaceEditor &&
                    (addingLandingSpace ||
                        selectedObject?.type === 'landing_space') && (
                        <div
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 2000,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0, 0, 0, 0.25)',
                            }}
                        >
                            <div
                                style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                }}
                            >
                                <div
                                    onClick={(event) => {
                                        const rect = event.currentTarget.getBoundingClientRect();

                                        const x = event.clientX - rect.left;
                                        const y = event.clientY - rect.top;

                                        const dx = x - 150;
                                        const dy = y - 150;

                                        const distanceFromCenter = Math.sqrt(
                                            dx * dx + dy * dy
                                        );

                                        if (distanceFromCenter > 150) {
                                            return;
                                        }

                                        setLandingSpaceEditorPosition({ x, y });
                                    }}
                                    style={{
                                        position: 'relative',
                                        width: '300px',
                                        height: '300px',
                                        border: '4px solid #444',
                                        borderRadius: '50%',
                                        cursor: 'crosshair',
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: '50%',
                                            top: '50%',
                                            width: '20px',
                                            height: '20px',
                                            transform: 'translate(-50%, -50%)',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '9px',
                                                top: 0,
                                                width: '2px',
                                                height: '20px',
                                                background: 'black',
                                            }}
                                        />

                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: '9px',
                                                width: '20px',
                                                height: '2px',
                                                background: 'black',
                                            }}
                                        />
                                    </div>

                                    {landingSpaces
                                        .filter(
                                            (landingSpace) =>
                                                addingLandingSpace ||
                                                landingSpace.landing_space_id !==
                                                selectedObject?.data?.landing_space_id
                                        )
                                        .map((landingSpace) => {
                                            const position =
                                                getLandingSpaceEditorPosition(landingSpace);

                                            if (!position) {
                                                return null;
                                            }

                                            return (
                                                <div
                                                    key={landingSpace.landing_space_id}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${position.x}px`,
                                                        top: `${position.y}px`,
                                                        width: '10px',
                                                        height: '10px',
                                                        transform: 'translate(-50%, -50%)',
                                                        borderRadius: '50%',
                                                        background: '#999',
                                                        border: '2px solid #333',
                                                    }}
                                                />
                                            );
                                        })}

                                    {(() => {
                                        const position = landingSpaceEditorPosition;

                                        if (!position) {
                                            return null;
                                        }

                                        return (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: `${position.x}px`,
                                                    top: `${position.y}px`,
                                                    width: '12px',
                                                    height: '12px',
                                                    transform: 'translate(-50%, -50%)',
                                                    borderRadius: '50%',
                                                    background: addingLandingSpace ? 'orange' : 'red',
                                                    border: '2px solid black',
                                                }}
                                            />
                                        );
                                    })()}

                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        marginTop: '12px',
                                    }}
                                >
                                    {addingLandingSpace ? (
                                        <button
                                            onClick={createLandingSpaceFromEditor}
                                        >
                                            Add Landing Space
                                        </button>) : (
                                        <button
                                            onClick={saveLandingSpaceEditorPosition}
                                        >
                                            Save Location
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setShowLandingSpaceEditor(false)}
                                    >
                                        Close
                                    </button>
                                </div>                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}