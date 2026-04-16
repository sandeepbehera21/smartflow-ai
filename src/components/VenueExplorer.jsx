import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_VENUE, VENUES } from '../data/venues';
import { useActiveVenueSync } from '../hooks/useFirestore';

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const FEATURE_OPTIONS = [
  { id: 'markers', label: 'Wait-Time Markers' },
  { id: 'overlay', label: 'Live Crowd Overlay' },
  { id: 'sync', label: 'Venue Sync Control' },
];

function getWaitMarkerColor(waitTime) {
  if (waitTime <= 8) return 'marker-fast';
  if (waitTime <= 15) return 'marker-moderate';
  if (waitTime <= 22) return 'marker-busy';
  return 'marker-heavy';
}

export default function VenueExplorer({ zones = {} }) {
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [activeVenue, setActiveVenueLocal] = useState(DEFAULT_VENUE);
  const [hasSelectedVenue, setHasSelectedVenue] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [activeFeature, setActiveFeature] = useState('markers');
  const { activeVenue: syncedVenue, updateActiveVenue } = useActiveVenueSync(DEFAULT_VENUE);

  useEffect(() => {
    if (syncedVenue?.id) {
      setActiveVenueLocal(syncedVenue);
    }
  }, [syncedVenue]);

  const filteredVenues = useMemo(() => {
    if (!query.trim()) return VENUES;
    const normalized = query.trim().toLowerCase();
    return VENUES.filter((venue) => (
      venue.name.toLowerCase().includes(normalized)
      || venue.city.toLowerCase().includes(normalized)
    ));
  }, [query]);

  const mapQuery = encodeURIComponent(`${activeVenue.name}, ${activeVenue.city}`);
  const mapSrc = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  const autoDetectNearest = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = VENUES.reduce((best, venue) => {
          const distance = haversine(pos.coords.latitude, pos.coords.longitude, venue.lat, venue.lon);
          return distance < best.distance ? { venue, distance } : best;
        }, { venue: VENUES[0], distance: Number.POSITIVE_INFINITY });
        setActiveVenueLocal(nearest.venue);
        setHasSelectedVenue(true);
        if (isAdmin && activeFeature === 'sync') {
          updateActiveVenue(nearest.venue).catch(() => {});
        }
        setDetecting(false);
      },
      () => setDetecting(false),
      { timeout: 6000 }
    );
  };

  const markerData = (activeVenue.markerNodes || []).map((node) => {
    const zone = zones[node.zoneId] || {};
    const waitTime = zone.waitTime || 0;
    const density = zone.density || 0;
    return {
      ...node,
      waitTime,
      density,
    };
  });

  const avgDensity = markerData.length
    ? markerData.reduce((sum, marker) => sum + marker.density, 0) / markerData.length
    : 0;

  const overlayAlpha = Math.min(0.55, Math.max(0.12, avgDensity * 0.65));

  const handleVenueSelect = async (venue) => {
    setActiveVenueLocal(venue);
    setHasSelectedVenue(true);
    if (isAdmin && activeFeature === 'sync') {
      await updateActiveVenue(venue);
    }
  };

  if (!hasSelectedVenue) {
    return (
      <section className="venue-explorer card" style={{ marginBottom: 24 }}>
        <div className="venue-explorer-header">
          <div>
            <h2 className="venue-explorer-title">Select Active Venue</h2>
            <p className="venue-explorer-subtitle">First choose a stadium, then the live map view will open.</p>
          </div>
          <div className="venue-explorer-search-wrap">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="venue-explorer-search"
              placeholder="Search stadiums or cities..."
              aria-label="Search stadiums"
            />
          </div>
        </div>

        <div style={{ margin: '10px 0 14px' }}>
          <button className="btn btn-ghost btn-sm" onClick={autoDetectNearest} disabled={detecting}>
            {detecting ? 'Detecting nearest...' : 'Auto-Detect Nearest Stadium'}
          </button>
        </div>

        <div className="venue-select-grid">
          {filteredVenues.map((venue) => (
            <button
              key={venue.id}
              type="button"
              className="venue-select-card"
              onClick={() => handleVenueSelect(venue)}
            >
              <div className="venue-item-name">{venue.name}</div>
              <div className="venue-item-city">{venue.city}</div>
              <div className="venue-item-link">Connect</div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="venue-explorer card" style={{ marginBottom: 24 }}>
      <div className="venue-explorer-header">
        <div>
          <h2 className="venue-explorer-title">Select Active Venue</h2>
          <p className="venue-explorer-subtitle">Connect to a live stadium data engine in India.</p>
        </div>
        <div className="venue-explorer-search-wrap">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="venue-explorer-search"
            placeholder="Search stadiums or cities..."
            aria-label="Search stadiums"
          />
        </div>
      </div>

      <div style={{ margin: '10px 0 14px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setHasSelectedVenue(false)}>
          Change Stadium
        </button>
      </div>

      <div className="venue-explorer-grid">
        <div className="venue-feature-sidebar">
          <div className="venue-feature-title">Feature Sidebar</div>
          <div className="venue-feature-list">
            {FEATURE_OPTIONS.map((feature) => (
              <button
                key={feature.id}
                type="button"
                className={`venue-feature-btn ${activeFeature === feature.id ? 'active' : ''}`}
                onClick={() => setActiveFeature(feature.id)}
              >
                {feature.label}
              </button>
            ))}
          </div>
          <div className="venue-feature-note">
            {activeFeature === 'markers' && 'Color markers show live queue time on the map panel.'}
            {activeFeature === 'overlay' && 'Overlay intensity is tied to Firestore crowd density.'}
            {activeFeature === 'sync' && (isAdmin
              ? 'Admin mode: selecting a venue syncs it for all attendees in real time.'
              : `Synced venue from operations: ${syncedVenue?.name || activeVenue.name}`)}
          </div>
        </div>

        <div className="venue-list-panel">
          <div className="venue-list-scroll">
            {filteredVenues.map((venue) => {
              const active = activeVenue.id === venue.id;
              return (
                <button
                  key={venue.id}
                  type="button"
                  className={`venue-item ${active ? 'active' : ''}`}
                  onClick={() => handleVenueSelect(venue)}
                >
                  <div className="venue-item-name">{venue.name}</div>
                  <div className="venue-item-city">{venue.city}</div>
                  <div className="venue-item-link">
                    {isAdmin && activeFeature === 'sync' ? 'Set Active Venue' : 'Connect'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="venue-map-panel">
          <div className="venue-map-header">
            <div className="venue-item-name">{activeVenue.name}</div>
            <div className="badge badge-blue">Live Geo View</div>
          </div>
          <div className="venue-map-shell">
            <iframe
              title={`Map of ${activeVenue.name}`}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="venue-map-iframe"
            />

            {(activeFeature === 'overlay' || activeFeature === 'markers') && (
              <div
                className="venue-crowd-overlay"
                style={{ background: `linear-gradient(180deg, rgba(239,68,68,${overlayAlpha}) 0%, rgba(245,158,11,${overlayAlpha * 0.9}) 40%, rgba(16,185,129,${overlayAlpha * 0.75}) 100%)` }}
              />
            )}

            {activeFeature === 'markers' && markerData.map((marker) => (
              <div
                key={marker.id}
                className={`venue-wait-marker ${getWaitMarkerColor(marker.waitTime)}`}
                style={{ top: `${marker.top}%`, left: `${marker.left}%` }}
                title={`${marker.label}: ${marker.waitTime}m wait`}
              >
                <div className="venue-wait-mins">{marker.waitTime}m</div>
                <div className="venue-wait-label">{marker.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}