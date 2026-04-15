import { useMemo } from 'react';
import { ZONES } from '../engine/simulationEngine';

function getDensityColor(d) {
  if (d < 0.35) return '#10b981';
  if (d < 0.60) return '#06b6d4';
  if (d < 0.75) return '#f59e0b';
  if (d < 0.88) return '#f97316';
  return '#ef4444';
}

function getDensityLabel(d) {
  if (d < 0.35) return 'Clear';
  if (d < 0.6)  return 'Moderate';
  if (d < 0.75) return 'Busy';
  if (d < 0.88) return 'High';
  return 'Critical';
}

function getDensityBadgeClass(d) {
  if (d < 0.35) return 'badge-green';
  if (d < 0.6)  return 'badge-teal';
  if (d < 0.75) return 'badge-yellow';
  if (d < 0.88) return 'badge-red';
  return 'badge-red';
}

const TYPE_ICONS = {
  entry: '🚪',
  food: '🍔',
  restroom: '🚻',
  seating: '💺',
  vip: '⭐',
  merch: '👕',
  medical: '🏥',
  field: '⚽',
};

const TYPE_COLORS = {
  entry:    'rgba(59,130,246,0.12)',
  food:     'rgba(245,158,11,0.12)',
  restroom: 'rgba(139,92,246,0.12)',
  seating:  'rgba(16,185,129,0.12)',
  vip:      'rgba(234,179,8,0.12)',
  merch:    'rgba(236,72,153,0.12)',
  medical:  'rgba(239,68,68,0.12)',
};

export default function QueueManager({ zones }) {
  const zoneList = useMemo(() => {
    return Object.entries(ZONES)
      .filter(([id]) => id !== 'FIELD')
      .map(([id, zone]) => ({
        id, ...zone, ...zones[id],
      }))
      .sort((a, b) => (b.density || 0) - (a.density || 0));
  }, [zones]);

  const foodZones  = zoneList.filter(z => z.type === 'food');
  const restZones  = zoneList.filter(z => z.type === 'restroom');
  const entryZones = zoneList.filter(z => z.type === 'entry');
  const otherZones = zoneList.filter(z => !['food','restroom','entry','field'].includes(z.type));

  const renderGroup = (title, items, emoji) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {emoji} {title}
      </div>
      <div className="queue-list">
        {items.map(zone => {
          const d = zone.density || 0;
          const color = getDensityColor(d);
          const isAlert = d > 0.85;
          return (
            <div key={zone.id} className={`queue-item ${isAlert ? 'alert-item' : ''}`}>
              <div
                className="queue-icon"
                style={{ background: TYPE_COLORS[zone.type] || 'rgba(255,255,255,0.05)' }}
              >
                {TYPE_ICONS[zone.type] || '📍'}
              </div>
              <div className="queue-info">
                <div className="queue-name">{zone.name}</div>
                <div className="queue-meta">
                  <span className={`badge ${getDensityBadgeClass(d)}`}>
                    {getDensityLabel(d)}
                  </span>
                  <span>{Math.round(d * 100)}% capacity</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <div className="density-bar">
                    <div
                      className="density-bar-fill"
                      style={{ width: `${d * 100}%`, background: color }}
                    />
                  </div>
                </div>
              </div>
              <div className="queue-wait" style={{ color }}>
                {zone.waitTime || 0}
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}> min</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0 2px' }}>
      {renderGroup('Food Courts', foodZones, '🍔')}
      {renderGroup('Restrooms', restZones, '🚻')}
      {renderGroup('Entry / Exit Gates', entryZones, '🚪')}
      {renderGroup('Other Zones', otherZones, '📍')}
    </div>
  );
}
