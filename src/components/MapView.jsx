import { useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    Polyline,
    Circle,
    useMapEvents,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

function MapPositionTracker({ onMove }) {
    useMapEvents({
        moveend(e) {
            const center = e.target.getCenter();
            onMove([center.lat, center.lng]);
        },
    });

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

export default function MapView() {
    const [points, setPoints] = useState([]);
    const [mapMode, setMapMode] = useState('view');
    const [siteName, setSiteName] = useState('');
    const [siteDescription, setSiteDescription] = useState('');
    const [siteType, setSiteType] = useState('school');
    const [zoneName, setZoneName] = useState('');
    const [zoneType, setZoneType] = useState('restricted');
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [droneportName, setDroneportName] = useState('');
    const [droneportType, setDroneportType] = useState('recreation');
    const [droneportDiameter, setDroneportDiameter] = useState(25);
    const [originSelectedSiteId, setOriginSelectedSiteId] = useState('');
    const [destinationSelectedSiteId, setDestinationSelectedSiteId] = useState('');
    const [originSelectedDroneportId, setOriginSelectedDroneportId] = useState('');
    const [destinationSelectedDroneportId, setDestinationSelectedDroneportId] = useState('');
    const [minimumAircraftWeight, setMinimumAircraftWeight] = useState(4.0);
    const [maximumAircraftWeight, setMaximumAircraftWeight] = useState(50.0);
    const [routeDirection, setRouteDirection] = useState('2');
    const [routeBuffering, setRouteBuffering] = useState(0);
    const [routeName, setRouteName] = useState('');
    const [routeType, setRouteType] = useState('open');
    const [mapCenter, setMapCenter] = useState([34.0754, -84.2941]);
    const [currentCenter, setCurrentCenter] = useState([34.0754, -84.2941]);
    const [authorityId, setAuthorityId] = useState(
        '019e886f-5110-7067-90f9-17e73143a30a'
    );
    const [savedSites, setSavedSites] = useState([]);
    const [savedZones, setSavedZones] = useState([]);
    const [savedDroneports, setSavedDroneports] = useState([]);
    const [savedRoutes, setSavedRoutes] = useState([]);
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

    const [approachSegmentMinimumAltitude, setApproachSegmentMinimumAltitude] = useState(0);
    const [routeSegmentMinimumAltitude, setRouteSegmentMinimumAltitude] = useState(45);
    const [approachSegmentMaximumAltitude, setApproachSegmentMaximumAltitude] = useState(55);
    const [routeSegmentMaximumAltitude, setRouteSegmentMaximumAltitude] = useState(400);
    const [routeSpeedLimit, setRouteSpeedLimit] = useState(15);
    const [routeWidth, setRouteSWidth] = useState(10);

    function handleMapClick(latlng) {
        console.log('Map clicked:', mapMode, latlng);

        if (mapMode === 'view') {
            return;
        }

        if (mapMode === 'create_droneport') {
            setPoints([latlng]);
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
            const response = await fetch('https://api.dronenav.org/api/sites');

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
            const response = await fetch('https://api.dronenav.org/api/zones');

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

    async function loadDroneports() {
        try {
            const response = await fetch('https://api.dronenav.org/api/droneports');

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

    async function loadRoutes() {
        try {
            const response = await fetch('https://api.dronenav.org/api/routes');

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
                created_by: 'dronenav',
                geometry: geoJson,
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

    const droneportPayload =
        droneportJson && droneportName.trim() && selectedSiteId
            ? {
                site_id: selectedSiteId,
                droneport_name: droneportName,
                droneport_type: droneportType,
                created_by: 'dronenav',
                droneport_diameter_ft: droneportDiameter,
                geometry: droneportJson,
            }
            : null;

const routeSegmentAttributes =
    points.length >= 4
        ? points.slice(0, -1).map((point, index) => {
            const isDepartureSegment = index === 0;
            const isApproachSegment = index === points.length - 2;
            const isApproachOrDeparture =
                isDepartureSegment || isApproachSegment;

            return {
                route_width_ft: 10,
                minimum_altitude_ft: isApproachOrDeparture ? 0 : 45,
                maximum_altitude_ft: isApproachOrDeparture ? 55 : 400,
                speed_limit_mph: 15,
            };
        })
        : [];

    const routePayload =
        routeJson && routeName.trim() && originSelectedSiteId && destinationSelectedSiteId
            && originSelectedDroneportId && destinationSelectedDroneportId
            ? {
                origin_site_id: originSelectedSiteId,
                destination_site_id: destinationSelectedSiteId,
                origin_droneport_id: originSelectedDroneportId,
                destination_droneport_id: destinationSelectedDroneportId,
                route_name: routeName,
                route_type: routeType,
                created_by: 'dronenav',
                minimum_aircraft_weight_lbs: minimumAircraftWeight,
                maximum_aircraft_weight_lbs: maximumAircraftWeight,
                direction: Number(routeDirection),
                buffered: routeBuffering,
                segment_attributes: routeSegmentAttributes,
                geometry: routeJson,
            }
            : null;

    async function saveSite() {
        if (!sitePayload) {
            alert('Enter a site name and draw a boundary with at least 3 points.');
            return;
        }

        try {
            console.log('Sending payload:', JSON.stringify(sitePayload, null, 2));
            const response = await fetch('https://api.dronenav.org/api/sites', {
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
            const response = await fetch('https://api.dronenav.org/api/zones', {
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
            const response = await fetch('https://api.dronenav.org/api/droneports', {
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
        } catch (error) {
            console.error('Save failed:', error);
            alert('Droneport save failed. Check browser console.');
        }
    }

    async function saveRoute() {
        if (!routePayload) {
            alert('Select two sites, two droneports, enter a route name, and select points for at least three route segments.');
            return;
        }

        try {
            console.log('Sending payload:', JSON.stringify(routePayload, null, 2));
            const response = await fetch('https://api.dronenav.org/api/routes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(routePayload),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('API error:', JSON.stringify(result, null, 2));
                alert('Route save failed. Check browser console.');
                return;
            }

            console.log('Route saved:', result);
            alert('Route saved successfully.');
        } catch (error) {
            console.error('Route save failed:', error);
            alert('Route save failed. Check browser console.');
        }
    }

    return (
        <div>
            <div style={{ padding: '10px' }}>

                <h3>Map Mode</h3>

                <select
                    value={mapMode}
                    onChange={(e) => {
                        setMapMode(e.target.value);
                        clearPoints();
                    }}
                >
                    <option value="view">View</option>
                    <option value="create_site">Create Site</option>
                    <option value="create_zone">Create Zone</option>
                    <option value="create_droneport">Create DronePort</option>
                    <option value="create_route">Create Route</option>
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
                            <option value="school">School</option>
                            <option value="park">Park</option>
                            <option value="commercial">Commercial</option>
                            <option value="private">Private</option>
                            <option value="government">Government</option>
                            <option value="residential">Residential</option>
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

                        <select
                            value={zoneType}
                            onChange={(e) => setZoneType(e.target.value)}
                        >
                            <option value="private">Closed</option>
                            <option value="restricted">Restricted</option>
                            <option value="caution">Hazardous</option>
                            <option value="emergency">Emergency</option>
                            <option value="open">Open</option>
                            <option value="inclusion">Inclusion</option>
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

                        <select
                            value={droneportType}
                            onChange={(e) => setDroneportType(e.target.value)}
                        >
                            <option value="recreation">Recreation</option>
                            <option value="education">Education</option>
                            <option value="commercial">Commercial</option>
                            <option value="emergency">Emergency</option>
                            <option value="military">Military</option>
                            <option value="government">Government</option>
                            <option value="civil">Civil</option>
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

                        <select
                            value={originSelectedSiteId}
                            onChange={(e) => setOriginSelectedSiteId(e.target.value)}
                        >
                            <option value="">Select Origin Site</option>
                            {savedSites.map((site) => (
                                <option key={site.site_id} value={site.site_id}>
                                    {site.site_name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={destinationSelectedSiteId}
                            onChange={(e) => setDestinationSelectedSiteId(e.target.value)}
                        >
                            <option value="">Select Destination Site</option>
                            {savedSites.map((site) => (
                                <option key={site.site_id} value={site.site_id}>
                                    {site.site_name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={originSelectedDroneportId}
                            onChange={(e) => setOriginSelectedDroneportId(e.target.value)}
                        >
                            <option value="">Select Origin DronePort</option>
                            {savedDroneports.map((droneport) => (
                                <option key={droneport.droneport_id} value={droneport.droneport_id}>
                                    {droneport.droneport_name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={destinationSelectedDroneportId}
                            onChange={(e) => setDestinationSelectedDroneportId(e.target.value)}
                        >
                            <option value="">Select Destination DronePort</option>
                            {savedDroneports.map((droneport) => (
                                <option key={droneport.droneport_id} value={droneport.droneport_id}>
                                    {droneport.droneport_name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Route Name"
                            value={routeName}
                            onChange={(e) => setRouteName(e.target.value)}
                        />

                        <select
                            value={routeType}
                            onChange={(e) => setRouteType(e.target.value)}
                        >
                            <option value="open">Open</option>
                            <option value="commercial">Commercial</option>
                            <option value="emergency">Emergency</option>
                            <option value="raceway">Raceway</option>
                        </select>

                        <input
                            type="number"
                            placeholder="4"
                            value={minimumAircraftWeight}
                            onChange={(e) => setMinimumAircraftWeight(Number(e.target.value))}
                        />

                        <input
                            type="number"
                            placeholder="50"
                            value={maximumAircraftWeight}
                            onChange={(e) => setMaximumAircraftWeight(Number(e.target.value))}
                        />

                        <select
                            value={routeDirection}
                            onChange={(e) => setRouteDirection(e.target.value)}
                        >
                            <option value="2">Bi-directional</option>
                            <option value="0">One-way</option>
                            <option value="1">Reverse</option>
                        </select>

                        <input
                            type="number"
                            placeholder="0"
                            value={routeBuffering}
                            onChange={(e) => setRouteBuffering(Number(e.target.value))}
                        />

                        <button onClick={saveRoute} style={{ marginLeft: '10px' }}>
                            Save Route
                        </button>
                    </>
                )}

            </div>

            {mapMode === 'create_site' && sitePayload && (
                <div style={{ padding: '10px' }}>
                    <h3>Site Payload Preview</h3>
                    <pre>{JSON.stringify(sitePayload, null, 2)}</pre>
                </div>
            )}

            {mapMode === 'create_zone' && zonePayload && (
                <div style={{ padding: '10px' }}>
                    <h3>Zone Payload Preview</h3>
                    <pre>{JSON.stringify(zonePayload, null, 2)}</pre>
                </div>
            )}

            {mapMode === 'create_droneport' && droneportPayload && (
                <div style={{ padding: '10px' }}>
                    <h3>DronePort Payload Preview</h3>
                    <pre>{JSON.stringify(droneportPayload, null, 2)}</pre>
                </div>
            )}

            {mapMode === 'create_route' && routePayload && (
                <div style={{ padding: '10px' }}>
                    <h3>Route Payload Preview</h3>
                    <pre>{JSON.stringify(routePayload, null, 2)}</pre>
                </div>
            )}

            <div style={{ padding: '10px' }}>
                Current Center: {currentCenter[0].toFixed(6)},{' '}
                {currentCenter[1].toFixed(6)}
            </div>

            <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '600px', width: '100%' }}
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler onMapClick={handleMapClick} />
                <MapPositionTracker onMove={setCurrentCenter} />

                {points.map((point, index) => (
                    <Marker key={index} position={[point.lat, point.lng]}>
                        <Popup>
                            Boundary Point {index + 1}
                            <br />
                            Lat: {point.lat.toFixed(6)}
                            <br />
                            Lng: {point.lng.toFixed(6)}
                        </Popup>
                    </Marker>
                ))}

                {(mapMode === 'create_site' || mapMode === 'create_zone') &&
                    points.length >= 3 && <Polygon positions={polygonPositions} />}

                {mapMode === 'create_route' &&
                    points.length >= 4 && (
                        <Polyline positions={polylinePositions} />
                    )}

                {mapMode === 'create_droneport' && points.length === 1 && (
                    <Circle
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
                    .map((site) => (
                        <Polygon
                            key={`${site.site_id}-${mapMode}`}
                            positions={site.geometry.coordinates[0].map((coordinate) => [
                                coordinate[1],
                                coordinate[0],
                            ])}
                            pathOptions={{
                                color: site.operational_status === 'active' ? 'green' : 'gray',
                                weight: 3,
                                fillOpacity: 0.15,
                                dashArray: site.operational_status === 'active' ? null : '4, 8',
                            }}
                            interactive={mapMode === 'view'}
                            bubblingMouseEvents={false}
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
                                </Popup>
                            )}
                        </Polygon>
                    ))}

                {savedZones
                    .filter(
                        (zone) =>
                            zone.geometry &&
                            zone.geometry.type === 'Polygon' &&
                            Array.isArray(zone.geometry.coordinates) &&
                            Array.isArray(zone.geometry.coordinates[0]) &&
                            zone.geometry.coordinates[0].length >= 4
                    )
                    .map((zone) => (
                        <Polygon
                            key={`${zone.zone_id}-${mapMode}`}
                            positions={zone.geometry.coordinates[0].map((coordinate) => [
                                coordinate[1],
                                coordinate[0],
                            ])}
                            pathOptions={{
                                color: zone.operational_status === 'active' ? 'red' : 'orange',
                                weight: 3,
                                fillOpacity: 0.15,
                                dashArray: zone.operational_status === 'active' ? null : '4, 8',
                            }}
                            interactive={mapMode === 'view'}
                            bubblingMouseEvents={false}
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
                    ))}

                {savedDroneports
                    .filter(
                        (droneport) =>
                            droneport.geometry &&
                            droneport.geometry.type === 'Point' &&
                            Array.isArray(droneport.geometry.coordinates)
                    )
                    .map((droneport) => (
                        <Circle
                            key={`${droneport.droneport_id}-${mapMode}`}
                            center={[
                                droneport.geometry.coordinates[1],
                                droneport.geometry.coordinates[0],
                            ]}
                            radius={(droneport.droneport_diameter_ft / 2) * 0.3048}
                            pathOptions={{
                                color: 'purple',
                                weight: 3,
                                fillOpacity: 0.15,
                            }}
                            interactive={mapMode === 'view'}
                            bubblingMouseEvents={false}
                        >
                            {mapMode === 'view' && (
                                <Popup>
                                    <strong>{droneport.droneport_name}</strong>
                                    <br />
                                    Type: {droneport.droneport_type}
                                    <br />
                                    Status: {droneport.operational_status}
                                    <br />
                                    Site ID: {droneport.site_id}
                                    <br />
                                    Droneport ID: {droneport.droneport_id}
                                    <br />
                                    Diameter: {droneport.droneport_diameter_ft} ft
                                    <br />
                                    Created by: {droneport.created_by}
                                </Popup>
                            )}
                        </Circle>
                    ))}

                {savedRoutes
                    .filter(
                        (route) =>
                            route.geometry &&
                            route.geometry.type === 'LineString' &&
                            Array.isArray(route.geometry.coordinates) &&
                            route.geometry.coordinates.length >= 4
                    )
                    .map((route) => (
                        <Polyline
                            key={`${route.route_id}-${mapMode}`}
                            positions={route.geometry.coordinates.map((coordinate) => [
                                coordinate[1],
                                coordinate[0],
                            ])}
                            pathOptions={{
                                color: 'green',
                                weight: 2,
                                dashArray: route.operational_status === 'active' ? null : '4, 8',
                            }}
                            interactive={mapMode === 'view'}
                            bubblingMouseEvents={false}
                        >
                            {mapMode === 'view' && (
                                <Popup>
                                    <strong>{route.route_name}</strong>
                                    <br />
                                    Type: {route.route_type}
                                    <br />
                                    Status: {route.operational_status}
                                    <br />
                                    Origin Site ID: {route.origin_site_id}
                                    <br />
                                    Destination Site ID: {route.destination_site_id}
                                    <br />
                                    Origin DronePort ID: {route.origin_droneport_id}
                                    <br />
                                    Destination DronePort ID: {route.destination_droneport_id}
                                    <br />
                                    Minimum Aircraft Weight: {route.minimum_aircraft_weight_lbs}
                                    <br />
                                    Maximum Aircraft Weight: {route.maximum_aircraft_weight_lbs}
                                    <br />
                                    Route Direction: {route.direction}
                                    <br />
                                    Route Buffer: {route.buffered}
                                    <br />
                                    Route ID: {route.route_id}
                                    <br />
                                    Created by: {route.created_by}
                                </Popup>
                            )}
                        </Polyline>
                    ))}

            </MapContainer>
        </div>
    );
}