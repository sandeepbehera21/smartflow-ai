import React from 'react';
import { useMemo, useState } from 'react';
import Chatbot from '../components/Chatbot';
import OrderModal from '../components/OrderModal';
import OrderTracker from '../components/OrderTracker';
import QueueManager from '../components/QueueManager';
import Recommendations from '../components/Recommendations';
import StadiumMap from '../components/StadiumMap';
import { DEFAULT_VENUE, VENUES } from '../data/venues';
import { useActiveVenueSync, useFirestoreCrowdData, useVenueUpdates } from '../hooks/useFirestore';

const PHASE_LABELS = {
  PRE_MATCH: 'Match starts in ~30 min',
  MATCH: 'Match in progress - 2nd Half',
  HALF_TIME: 'Half Time - 15 min break',
  POST_MATCH: 'Match ended - safely exit',
};

const LANGUAGES = ['GB EN', 'ES ES', 'FR FR', 'DE DE', 'JA JP', 'BR PT'];

const FEATURE_SIDEBAR = [
  'Live Stadium Map',
  'Queue Intelligence',
  'AI Picks',
  'My Orders',
];

const STANDS = ['North Stand', 'East Stand', 'West Stand', 'South Stand', 'VIP Box'];

export default function AttendeePage({ data }) {
  const [tab, setTab] = useState('map');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState('GB EN');
  const [setupStep, setSetupStep] = useState('select');
  const [venueSearch, setVenueSearch] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(DEFAULT_VENUE);
  const [seatInfo, setSeatInfo] = useState({ stand: STANDS[0], row: 'A', seat: '12' });
  const { crowdData } = useFirestoreCrowdData();
  const venueUpdates = useVenueUpdates();
  const { activeVenue: syncedVenue } = useActiveVenueSync(DEFAULT_VENUE);

  const zones = crowdData?.zones || data?.zones || {};
  const phase = crowdData?.eventPhase || data?.eventPhase || 'PRE_MATCH';
  const alerts = crowdData?.alerts || data?.alerts || [];
  const stats = crowdData?.stats || data?.stats || {};

  const overallCrowdPct = Math.round((stats.avgDensity || 0) * 100);
  const maxWait = Math.max(0, ...Object.values(zones).map((zone) => zone.waitTime || 0));
  const latestVenueUpdate = venueUpdates[0];

  const filteredVenues = useMemo(() => {
    if (!venueSearch.trim()) return VENUES;
    const q = venueSearch.trim().toLowerCase();
    return VENUES.filter((venue) => venue.name.toLowerCase().includes(q) || venue.city.toLowerCase().includes(q));
  }, [venueSearch]);

  const selectedVenueMapSrc = `https://www.google.com/maps?q=${encodeURIComponent(`${selectedVenue.name}, ${selectedVenue.city}`)}&output=embed`;

  const openDashboard = () => {
    if (!seatInfo.row.trim() || !seatInfo.seat.trim()) return;
    setSetupStep('dashboard');
    setTab('map');
  };

  const resetSetup = () => {
    if (syncedVenue?.id) {
      setSelectedVenue(syncedVenue);
    }
    setSetupStep('select');
  };

  if (setupStep !== 'dashboard') {
    return (
      <div className="attendee-root">
        <div className="attendee-setup-shell">
          <aside className="attendee-feature-sidebar card" aria-label="Feature Sidebar">
            <div className="attendee-feature-title">Feature Sidebar</div>
            <div className="attendee-feature-list">
              {FEATURE_SIDEBAR.map((item) => (
                <div key={item} className="attendee-feature-item">{item}</div>
              ))}
            </div>
            <div className="attendee-feature-note">
              Step 1: Select Stadium
              <br />
              Step 2: Book Seat
              <br />
              Step 3: Open Live Dashboard
            </div>
          </aside>

          <section className="card attendee-setup-main">
            {setupStep === 'select' && (
              <>
                <div className="section-title">Select Stadium</div>
                <div className="section-subtitle">Choose your venue first, then continue to seat booking.</div>
                <div style={{ marginTop: 14 }}>
                  <input
                    className="venue-explorer-search"
                    placeholder="Search stadium or city"
                    aria-label="Search stadium"
                    value={venueSearch}
                    onChange={(event) => setVenueSearch(event.target.value)}
                  />
                </div>
                <div className="venue-select-grid" style={{ marginTop: 14 }}>
                  {filteredVenues.map((venue) => (
                    <button
                      key={venue.id}
                      type="button"
                      className="venue-select-card"
                      aria-label={`Select ${venue.name}`}
                      onClick={() => {
                        setSelectedVenue(venue);
                        setSetupStep('seat');
                      }}
                    >
                      <div className="venue-item-name">{venue.name}</div>
                      <div className="venue-item-city">{venue.city}</div>
                      <div className="venue-item-link">Select Stadium</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {setupStep === 'seat' && (
              <>
                <div className="section-title">Book Your Seat</div>
                <div className="section-subtitle">Stadium selected: {selectedVenue.name}</div>

                <div className="attendee-stadium-photo-wrap" style={{ marginTop: 14 }}>
                  <iframe
                    title={`Map preview ${selectedVenue.name}`}
                    src={selectedVenueMapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="attendee-stadium-photo"
                  />
                  <div className="attendee-stadium-photo-overlay">
                    <div className="attendee-stadium-photo-name">{selectedVenue.name}</div>
                    <div className="attendee-stadium-photo-city">{selectedVenue.city}</div>
                  </div>
                </div>

                <div className="attendee-seat-grid">
                  <label className="attendee-seat-field" htmlFor="seat-stand">
                    <span>Stand</span>
                    <select
                      id="seat-stand"
                      value={seatInfo.stand}
                      onChange={(event) => setSeatInfo((prev) => ({ ...prev, stand: event.target.value }))}
                    >
                      {STANDS.map((stand) => <option key={stand} value={stand}>{stand}</option>)}
                    </select>
                  </label>

                  <label className="attendee-seat-field" htmlFor="seat-row">
                    <span>Row</span>
                    <input
                      id="seat-row"
                      aria-label="Seat row"
                      value={seatInfo.row}
                      onChange={(event) => setSeatInfo((prev) => ({ ...prev, row: event.target.value.toUpperCase() }))}
                      maxLength={3}
                    />
                  </label>

                  <label className="attendee-seat-field" htmlFor="seat-number">
                    <span>Seat Number</span>
                    <input
                      id="seat-number"
                      aria-label="Seat number"
                      value={seatInfo.seat}
                      onChange={(event) => setSeatInfo((prev) => ({ ...prev, seat: event.target.value }))}
                      maxLength={4}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="btn btn-ghost" onClick={() => setSetupStep('select')} aria-label="Go back to stadium selection">Back</button>
                  <button className="btn btn-primary" onClick={openDashboard} aria-label="Confirm seat and open dashboard">Confirm Seat and Continue</button>
                </div>
              </>
            )}
          </section>
        </div>
        <Chatbot />
      </div>
    );
  }

  return (
    <div className="attendee-root">
      <div className="attendee-hero">
        <div className="attendee-hero-glow" />
        <div className="attendee-hero-inner">
          <div className="attendee-hero-text">
            <div className="attendee-hero-label">WELCOME TO SMARTFLOW AI</div>
            <h1 className="attendee-hero-title">{selectedVenue.name}</h1>
            <div className="attendee-hero-phase">{PHASE_LABELS[phase]}</div>
          </div>
          <div className="attendee-hero-stats">
            {[
              { label: 'Stadium Full', value: `${overallCrowdPct}%`, color: overallCrowdPct > 70 ? '#f59e0b' : '#10b981' },
              { label: 'Max Wait', value: `${maxWait}m`, color: maxWait > 15 ? '#f59e0b' : '#10b981' },
              { label: 'Alerts', value: alerts.length, color: alerts.length > 0 ? '#ef4444' : '#10b981' },
              { label: 'Phase', value: phase.replace('_', ' '), color: '#60a5fa' },
            ].map((item) => (
              <div key={item.label} className="attendee-hero-stat-item">
                <div className="attendee-hero-stat-val" style={{ color: item.color }}>{item.value}</div>
                <div className="attendee-hero-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        margin: '0 0 24px',
      }}>
        {[
          { label: 'Decision Support', value: 'Live', note: 'Queue and congestion guidance updates continuously through the event.' },
          { label: 'Pickup Visibility', value: 'Tracked', note: 'Food orders move from placed to ready in one attendee timeline.' },
          { label: 'Venue Coordination', value: 'Connected', note: 'Operator advisories can flow directly into the attendee experience.' },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {kpi.note}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Why It Matters</div>
        <div className="section-subtitle">
          SmartFlow AI helps attendees make faster decisions inside the venue while helping operators coordinate alerts, crowd flow, and food-service updates from one shared system.
        </div>
      </div>

      <div className="card attendee-selected-stadium-card" style={{ marginBottom: 24 }}>
        <div className="attendee-selected-stadium-grid">
          <iframe
            title={`Selected venue map ${selectedVenue.name}`}
            src={selectedVenueMapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="attendee-stadium-photo"
          />
          <div>
            <div className="section-title">Selected Stadium</div>
            <div className="section-subtitle">{selectedVenue.name} - {selectedVenue.city}</div>
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Seat: {seatInfo.stand}, Row {seatInfo.row}, Seat {seatInfo.seat}
            </div>
            <div className="attendee-tabs" style={{ marginTop: 14 }}>
              {[
                { id: 'map', label: 'Live Stadium Map' },
                { id: 'queues', label: 'Queue Intelligence' },
                { id: 'ai', label: 'AI Picks' },
                { id: 'orders', label: 'My Orders' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`attendee-tab ${tab === item.id ? 'active' : ''}`}
                  aria-label={item.label}
                  aria-pressed={tab === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={resetSetup}>Change Stadium / Seat</button>
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="attendee-alerts-row">
          {alerts.slice(0, 4).map((alert, index) => (
            <div key={index} className={`alert-banner ${alert.severity}`}>
              {alert.severity === 'critical' ? 'RED' : 'WARN'} {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="attendee-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="attendee-right-col">
          {latestVenueUpdate && (
            <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(96,165,250,0.25)' }}>
              <div className="section-title">Live Venue Update</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
                {latestVenueUpdate.title}
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {latestVenueUpdate.message}
              </div>
            </div>
          )}

          <div className="animate-fadeIn" key={tab}>
            {tab === 'map' && (
              <div className="card attendee-map-card">
                <div style={{ marginBottom: 12 }}>
                  <div className="section-title">Live Stadium Map</div>
                  <div className="section-subtitle">Hover any zone for real-time details</div>
                </div>
                <StadiumMap zones={zones} />
              </div>
            )}

            {tab === 'queues' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="section-subtitle">Live wait-time guidance for food courts, restrooms, and exits.</div>
                </div>
                <QueueManager zones={zones} />
              </div>
            )}

            {tab === 'ai' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="section-subtitle">Smart recommendations based on current venue conditions</div>
                </div>
                <Recommendations zones={zones} eventPhase={phase} />

                <div className="attendee-order-card">
                  <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>Order Ahead</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Beat the queue and collect when ready.
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Place your order in advance and follow status updates through to pickup.
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => setShowOrderModal(true)}
                  >
                    Browse Menu and Order
                  </button>
                </div>

                <div className="card" style={{ marginTop: 16, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Multilingual Support - Tap a language to switch
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        className={`tag lang-tag ${selectedLang === lang ? 'active' : ''}`}
                        onClick={() => setSelectedLang(lang)}
                        title={`Switch to ${lang}`}
                        style={{
                          cursor: 'pointer',
                          border: selectedLang === lang ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          background: selectedLang === lang ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: selectedLang === lang ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: '0.78rem',
                          transition: 'all 0.2s',
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  {selectedLang !== 'GB EN' && (
                    <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                      Interface language set to <strong>{selectedLang}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="section-title">My Food Orders</div>
                  <div className="section-subtitle">Live status, prep progress, and pickup readiness</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <OrderTracker />
                </div>
                <div className="attendee-order-card" style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.95rem', marginBottom: 12 }}>
                    Ready to order more food?
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => setShowOrderModal(true)}
                  >
                    Place New Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showOrderModal && (
        <OrderModal
          onClose={() => setShowOrderModal(false)}
          onOrderPlaced={() => {
            setTimeout(() => {
              setTab('orders');
              setShowOrderModal(false);
            }, 2500);
          }}
        />
      )}

      <Chatbot />
    </div>
  );
}
