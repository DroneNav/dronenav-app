import React from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Existing application imports and render code follow.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import MapView from './components/MapView';

const rootElement = document.getElementById('root');

const mode = rootElement?.dataset?.mode || 'editor';
const overlayType = rootElement?.dataset?.overlayType || null;
const overlayUuid = rootElement?.dataset?.overlayUuid || null;
const siteId = rootElement?.dataset?.siteId || null;
const authorityId = rootElement?.dataset?.authorityId || null;

console.log('DroneNav map props:', {
    mode,
    overlayType,
    overlayUuid,
    siteId,
    authorityId,
});

createRoot(rootElement).render(
    <StrictMode>
        <MapView
            mode={mode}
            overlayType={overlayType}
            overlayUuid={overlayUuid}
            siteId={siteId}
            authorityId={authorityId}
        />
    </StrictMode>
);