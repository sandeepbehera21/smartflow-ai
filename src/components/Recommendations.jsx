import { useState } from 'react';
import { getRecommendations } from '../engine/simulationEngine';
import NavigationModal from './NavigationModal';

export default function Recommendations({ zones }) {
  const recs = getRecommendations('STAND_N');
  const [navZone, setNavZone] = useState(null);

  return (
    <>
      <div className="rec-list">
        {recs.map((rec, i) => (
          <div
            key={i}
            className={`rec-card urgency-${rec.urgency}`}
            role="article"
            aria-label={rec.title}
          >
            <div className="rec-emoji">{rec.icon}</div>
            <div className="rec-info">
              <div className="rec-title">{rec.title}</div>
              <div className="rec-desc">{rec.description}</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => setNavZone(rec.zoneId)}
              aria-label={`${rec.action} to ${rec.title}`}
            >
              {rec.action} →
            </button>
          </div>
        ))}

        {recs.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 16px',
            color: 'var(--text-muted)', fontSize: '0.875rem',
          }}>
            ✅ All clear! No urgent recommendations at this time.
          </div>
        )}
      </div>

      {/* Navigation Modal */}
      {navZone && (
        <NavigationModal
          zoneId={navZone}
          zones={zones}
          onClose={() => setNavZone(null)}
        />
      )}
    </>
  );
}
