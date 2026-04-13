import { useState } from 'react';
import { ZONES } from '../engine/simulationEngine';

function getDensityColor(density) {
  if (density < 0.35) return '#10b981';   // green
  if (density < 0.60) return '#06b6d4';   // teal
  if (density < 0.75) return '#f59e0b';   // yellow
  if (density < 0.88) return '#f97316';   // orange
  return '#ef4444';                        // red
}

function getDensityOpacity(density) {
  return 0.35 + density * 0.65;
}

// Zone circle radii by type
const ZONE_RADIUS = {
  entry: 5.5,
  food: 5,
  restroom: 4,
  seating: 10,
  vip: 6,
  merch: 4.5,
  medical: 4,
  field: 18,
};

export default function StadiumMap({ zones }) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const zoneEntries = Object.entries(ZONES);

  const handleMouseEnter = (e, zoneId) => {
    const rect = e.currentTarget.closest('.stadium-map-wrapper').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoveredZone(zoneId);
    setTooltip({ x, y });
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.closest('.stadium-map-wrapper')?.getBoundingClientRect();
    if (rect) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseLeave = () => setHoveredZone(null);

  const hZ = hoveredZone ? { ...ZONES[hoveredZone], ...zones[hoveredZone] } : null;
  const density = hZ ? hZ.density : 0;

  return (
    <div className="stadium-map-wrapper" style={{ position: 'relative' }}>
      <svg
        viewBox="0 0 100 100"
        className="stadium-map-svg"
        style={{ cursor: 'default' }}
        onMouseMove={handleMouseMove}
      >
        {/* SVG defs */}
        <defs>
          <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a472a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0d2818" stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d1628" />
            <stop offset="100%" stopColor="#080d1a" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="100" height="100" fill="url(#bgGrad)" rx="6" />

        {/* Stadium outer ring */}
        <ellipse cx="50" cy="50" rx="46" ry="44"
          fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="8"
        />
        <ellipse cx="50" cy="50" rx="46" ry="44"
          fill="none" stroke="rgba(59,130,246,0.06)" strokeWidth="14"
        />

        {/* Stands (seating zones as arcs approximated as ellipses) */}
        {['STAND_N', 'STAND_E', 'STAND_W', 'STAND_S'].map(id => {
          const z = ZONES[id];
          const d = zones[id]?.density || 0;
          const col = getDensityColor(d);
          const opa = getDensityOpacity(d);
          return (
            <ellipse
              key={id}
              cx={z.x}
              cy={z.y}
              rx={ZONE_RADIUS.seating * 1.5}
              ry={ZONE_RADIUS.seating * 0.7}
              fill={col}
              fillOpacity={opa * 0.4}
              stroke={col}
              strokeOpacity={opa * 0.7}
              strokeWidth="0.5"
              filter="url(#glow)"
              style={{ cursor: 'pointer', transition: 'all 0.6s ease' }}
              onMouseEnter={e => handleMouseEnter(e, id)}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}

        {/* Playing field */}
        <ellipse cx="50" cy="50" rx="18" ry="14" fill="url(#fieldGrad)" />
        {/* Field markings */}
        <ellipse cx="50" cy="50" rx="18" ry="14" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
        <line x1="50" y1="36" x2="50" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
        <ellipse cx="50" cy="50" rx="5" ry="4" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />

        {/* All non-seating zones */}
        {zoneEntries
          .filter(([id]) => !['STAND_N','STAND_E','STAND_W','STAND_S','FIELD','VIP_BOX'].includes(id))
          .map(([id, zone]) => {
            const d = zones[id]?.density || 0;
            const color = getDensityColor(d);
            const opacity = getDensityOpacity(d);
            const r = ZONE_RADIUS[zone.type] || 5;
            const isHovered = hoveredZone === id;
            const isAlert = d > 0.85;

            return (
              <g key={id} style={{ cursor: 'pointer' }}>
                {/* Glow ring for alerts */}
                {isAlert && (
                  <circle
                    cx={zone.x} cy={zone.y} r={r + 3}
                    fill={color} fillOpacity={0.12}
                    stroke={color} strokeOpacity={0.4} strokeWidth="0.5"
                  />
                )}
                <circle
                  cx={zone.x} cy={zone.y} r={isHovered ? r + 1 : r}
                  fill={color}
                  fillOpacity={isHovered ? opacity : opacity * 0.65}
                  stroke={color}
                  strokeOpacity={opacity}
                  strokeWidth={isHovered ? 1.2 : 0.6}
                  filter="url(#glow)"
                  style={{ transition: 'all 0.5s ease' }}
                  onMouseEnter={e => handleMouseEnter(e, id)}
                  onMouseLeave={handleMouseLeave}
                />
                {/* Zone label */}
                <text
                  x={zone.x}
                  y={zone.y + r + 3.5}
                  textAnchor="middle"
                  fontSize="2.8"
                  fill="rgba(255,255,255,0.55)"
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {zone.name.split(' ').slice(-1)[0].slice(0,5)}
                </text>
              </g>
            );
          })}

        {/* VIP Box in center-ish */}
        {(() => {
          const id = 'VIP_BOX';
          const zone = ZONES[id];
          const d = zones[id]?.density || 0;
          const color = getDensityColor(d);
          const opacity = getDensityOpacity(d);
          return (
            <g key={id} style={{ cursor: 'pointer' }}>
              <rect
                x={zone.x - 7} y={zone.y - 4} width="14" height="8"
                rx="2" fill={color} fillOpacity={opacity * 0.35}
                stroke={color} strokeOpacity={opacity * 0.8} strokeWidth="0.4"
                filter="url(#glow)"
                style={{ transition: 'all 0.5s ease' }}
                onMouseEnter={e => handleMouseEnter(e, id)}
                onMouseLeave={handleMouseLeave}
              />
              <text
                x={zone.x} y={zone.y + 1}
                textAnchor="middle"
                fontSize="2.5"
                fill="rgba(255,255,255,0.65)"
                fontFamily="Inter, sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                VIP
              </text>
            </g>
          );
        })()}

        {/* Compass */}
        <text x="50" y="4" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="Inter">N</text>
        <text x="96" y="51" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="Inter">E</text>
        <text x="50" y="99" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="Inter">S</text>
        <text x="4" y="51" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="Inter">W</text>
      </svg>

      {/* Tooltip */}
      {hoveredZone && hZ && (
        <div
          className="zone-tooltip"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 20,
            transform: tooltip.x > 320 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="zone-tooltip-name">{hZ.name}</div>
          <div className="zone-tooltip-density">
            <div style={{
              width: '100%', height: 6, background: 'rgba(255,255,255,0.08)',
              borderRadius: 99, overflow: 'hidden'
            }}>
              <div style={{
                width: `${density * 100}%`,
                height: '100%', borderRadius: 99,
                background: getDensityColor(density),
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
          <div className="zone-tooltip-row">
            <span>Density</span>
            <span style={{ color: getDensityColor(density), fontWeight: 600 }}>
              {Math.round(density * 100)}%
            </span>
          </div>
          <div className="zone-tooltip-row">
            <span>Wait Time</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              ~{hZ.waitTime || 0} min
            </span>
          </div>
          <div className="zone-tooltip-row">
            <span>Status</span>
            <span style={{ color: getDensityColor(density), fontWeight: 600 }}>
              {density < 0.4 ? '✅ Clear' : density < 0.7 ? '🟡 Moderate' : density < 0.85 ? '🟠 Busy' : '🔴 Critical'}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="map-legend">
        {[
          { color: '#10b981', label: 'Clear (<35%)' },
          { color: '#06b6d4', label: 'Moderate' },
          { color: '#f59e0b', label: 'Busy' },
          { color: '#ef4444', label: 'Critical' },
        ].map(item => (
          <div key={item.label} className="legend-item">
            <div className="legend-dot" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Heatmap scale */}
      <div className="heatmap-scale">
        <span>Low</span>
        <div className="heatmap-gradient" />
        <span>High</span>
      </div>
    </div>
  );
}
