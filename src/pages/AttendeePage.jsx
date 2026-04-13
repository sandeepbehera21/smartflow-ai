import { useState } from 'react';
import StadiumMap from '../components/StadiumMap';
import QueueManager from '../components/QueueManager';
import Recommendations from '../components/Recommendations';
import Chatbot from '../components/Chatbot';

const PHASE_LABELS = {
  PRE_MATCH: 'Match starts in ~30 min',
  MATCH: 'Match in progress — 2nd Half',
  HALF_TIME: 'Half Time — 15 min break',
  POST_MATCH: 'Match ended — safely exit',
};

export default function AttendeePage({ data }) {
  const [tab, setTab] = useState('queues');
  const zones = data?.zones || {};
  const phase = data?.eventPhase || 'PRE_MATCH';
  const alerts = data?.alerts || [];
  const stats = data?.stats || {};

  const overallCrowdPct = Math.round((stats.avgDensity || 0) * 100);
  const maxWait = Math.max(...Object.values(zones).map(z => z.waitTime || 0));

  return (
    <div className="attendee-root">
      {/* ── Top Hero Banner (full width) ─────────────────────── */}
      <div className="attendee-hero">
        <div className="attendee-hero-glow" />
        <div className="attendee-hero-inner">
          <div className="attendee-hero-text">
            <div className="attendee-hero-label">WELCOME TO SMARTFLOW AI</div>
            <h1 className="attendee-hero-title">Arena Championship 2025</h1>
            <div className="attendee-hero-phase">{PHASE_LABELS[phase]}</div>
          </div>
          <div className="attendee-hero-stats">
            {[
              { label: 'Stadium Full', value: `${overallCrowdPct}%`, color: overallCrowdPct > 70 ? '#f59e0b' : '#10b981' },
              { label: 'Max Wait', value: `${maxWait}m`, color: maxWait > 15 ? '#f59e0b' : '#10b981' },
              { label: 'Alerts', value: alerts.length, color: alerts.length > 0 ? '#ef4444' : '#10b981' },
              { label: 'Phase', value: phase.replace('_', ' '), color: '#60a5fa' },
            ].map(s => (
              <div key={s.label} className="attendee-hero-stat-item">
                <div className="attendee-hero-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="attendee-hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Alerts (full width) ───────────────────────── */}
      {alerts.length > 0 && (
        <div className="attendee-alerts-row">
          {alerts.slice(0, 4).map((a, i) => (
            <div key={i} className={`alert-banner ${a.severity}`}>
              {a.severity === 'critical' ? '🔴' : '🟡'} {a.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Main Content Grid ────────────────────────────────── */}
      <div className="attendee-grid">

        {/* LEFT Column – Stadium Map (always visible on desktop) */}
        <div className="attendee-map-col">
          <div className="card attendee-map-card">
            <div style={{ marginBottom: 12 }}>
              <div className="section-title">🗺️ Live Stadium Map</div>
              <div className="section-subtitle">Hover any zone for real-time details</div>
            </div>
            <StadiumMap zones={zones} />
          </div>
        </div>

        {/* RIGHT Column – Tabs for Queues / AI Picks + Recommendations */}
        <div className="attendee-right-col">

          {/* Tab Switcher */}
          <div className="attendee-tabs">
            {[
              { id: 'queues', label: '⏱️ Queue Intelligence' },
              { id: 'ai', label: '🎯 AI Picks' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`attendee-tab ${tab === t.id ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-fadeIn" key={tab}>
            {tab === 'queues' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="section-subtitle">Real-time wait times • Updates every 2s</div>
                </div>
                <QueueManager zones={zones} />
              </div>
            )}

            {tab === 'ai' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="section-subtitle">Personalized suggestions based on current conditions</div>
                </div>
                <Recommendations zones={zones} eventPhase={phase} />

                {/* Order Ahead card */}
                <div className="attendee-order-card">
                  <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>📱 Order Ahead</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Skip the food queue entirely!
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Pre-order from any food court and pick it up when ready — no waiting required.
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    🍔 Browse Menu & Order
                  </button>
                </div>

                {/* Multilingual note */}
                <div className="card" style={{ marginTop: 16, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    🌍 Multilingual Support
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['🇬🇧 EN', '🇪🇸 ES', '🇫🇷 FR', '🇩🇪 DE', '🇯🇵 JA', '🇧🇷 PT'].map(lang => (
                      <span key={lang} className="tag">{lang}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chatbot FAB */}
      <Chatbot />
    </div>
  );
}
