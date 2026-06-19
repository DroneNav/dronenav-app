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