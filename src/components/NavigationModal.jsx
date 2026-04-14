import { useEffect, useState } from 'react';
import { X, MapPin, Clock, Users, Navigation, CheckCircle } from 'lucide-react';
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
  if (d < 0.60) return 'Moderate';
  if (d < 0.75) return 'Busy';
  if (d < 0.88) return 'High';
  return 'Critical';
}

const DIRECTION_STEPS = {
  FOOD_A: ['Head north from your current section', 'Pass Gate A turnstiles on your left', 'Food Court Alpha is on your right (Level 1)', 'Look for the orange 🍔 signage'],
  FOOD_B: ['Head east towards Gate B', 'Turn right at the East Concourse', 'Food Court Beta is straight ahead (Level 1)', 'Look for the yellow 🍔 signage'],
  FOOD_C: ['Head south through the main corridor', 'Pass the merchandise store on your left', 'Food Court Gamma is at the south end (Level 1)', 'Adjacent to Gate D South Entry'],
  REST_N: ['Exit your seating row north', 'Follow the blue 🚻 signs along the concourse', 'Restrooms North — past the ticket office', 'Accessible entrance on the right'],
  REST_E: ['Head east through Concourse E', 'Take the stairs / ramp up to Level 2', 'Restrooms East — clearly marked with blue signs', 'Family restrooms available'],
  REST_W: ['Head west through Concourse W', 'Restrooms West — Level 1, near Gate C', 'Follow the blue 🚻 overhead signs', 'Accessible entrance available'],
  REST_S: ['Head south towards Gate D', 'Restrooms South are near the South Stand exit', 'Follow the blue 🚻 signs', 'Accessible facilities available'],
  GATE_A: ['Head north towards Gate A - Main Entry', 'Follow the green exit signs on the concourse', 'Show your ticket or use your digital pass', 'Gate A is the widest exit — faster flow'],
  GATE_B: ['Head east towards Gate B - East Entry', 'Follow exit signs along the East Concourse', 'Digital tickets accepted — no queue lane on the right', 'East entry has direct bus connections outside'],
  GATE_C: ['Head west towards Gate C - West Entry', 'Follow the white exit signs on Level 1', 'Gate C connects to the west car park', 'Typically less crowded than Gate A'],
  GATE_D: ['Head south to Gate D - South Entry', 'Follow green exit indicators south', 'Gate D connects to the south train station', 'Use the accessible slope on the left side'],
  STAND_N: ['Head to the North Stand seating section', 'Take the stairs or elevator at Concourse N', 'Your row will be marked on your ticket', 'Stewards are available to assist'],
  STAND_E: ['Head to the East Stand via Concourse E', 'Elevators available on Level 1 and 2', 'Premium lower-tier seats — show your pass', 'East Stand has the best view of the penalty area'],
  VIP_BOX: ['Proceed to the VIP entrance on Level 3', 'Your VIP lanyard grants express access', 'Dedicated elevator is on the north side', 'VIP host will greet you at the lounge'],
};

const TYPE_ICONS = {
  food: '🍔', restroom: '🚻', entry: '🚪', seating: '💺', vip: '⭐', merch: '👕', medical: '🏥',
};

export default function NavigationModal({ zoneId, zones, onClose }) {
  const [navigating, setNavigating] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);

  const zone = ZONES[zoneId];
  const zoneData = zones?.[zoneId] || {};
  const density = zoneData.density || 0;
  const waitTime = zoneData.waitTime || 0;
  const directions = DIRECTION_STEPS[zoneId] || [
    'Follow stadium signage to your destination',
    'Ask a steward for assistance if needed',
    'Your destination is marked on the stadium map',
  ];

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Animate step progression when navigating
  useEffect(() => {
    if (!navigating) return;
    if (step >= directions.length) { setDone(true); return; }
    const t = setTimeout(() => setStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [navigating, step, directions.length]);

  const handleStart = () => {
    setNavigating(true);
    setStep(0);
    setDone(false);
  };

  if (!zone) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`Navigate to ${zone.name}`}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="modal-icon">{TYPE_ICONS[zone.type] || '📍'}</div>
            <div>
              <div className="modal-title">{zone.name}</div>
              <div className="modal-subtitle" style={{ color: getDensityColor(density) }}>
                ● {getDensityLabel(density)} • {Math.round(density * 100)}% capacity
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Stats row */}
        <div className="modal-stats">
          <div className="modal-stat">
            <Clock size={14} />
            <span>~{waitTime} min wait</span>
          </div>
          <div className="modal-stat">
            <Users size={14} />
            <span>{Math.round(density * 100)}% full</span>
          </div>
          <div className="modal-stat">
            <MapPin size={14} />
            <span>Level 1 — Concourse</span>
          </div>
        </div>

        {/* Mini map indicator */}
        <div className="modal-minimap">
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <defs>
              <radialGradient id="mmBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0d1628" />
                <stop offset="100%" stopColor="#080d1a" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#mmBg)" rx="8" />
            <ellipse cx="50" cy="50" rx="40" ry="36" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="6" />
            <ellipse cx="50" cy="50" rx="18" ry="14" fill="rgba(26,71,42,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            {/* Current location pulse */}
            <circle cx="50" cy="85" r="3" fill="#3b82f6" opacity="0.9">
              <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text x="50" y="93" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.4)" fontFamily="Inter">YOU</text>
            {/* Destination pin */}
            <circle cx={zone.x} cy={zone.y} r="4" fill={getDensityColor(density)} opacity="0.9" filter="url(#glow)" />
            <circle cx={zone.x} cy={zone.y} r="6" fill={getDensityColor(density)} opacity="0.25" />
            <text x={zone.x} y={zone.y - 6} textAnchor="middle" fontSize="3" fill="white" fontFamily="Inter">{zone.name.split(' ').slice(-1)[0].slice(0,6)}</text>
            {/* Dotted path line */}
            <line x1="50" y1="82" x2={zone.x} y2={zone.y + 5}
              stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
          </svg>
        </div>

        {/* Directions */}
        <div className="modal-directions">
          <div className="modal-section-label">
            <Navigation size={13} /> Turn-by-Turn Directions
          </div>
          <ol className="direction-steps">
            {directions.map((step_text, i) => (
              <li
                key={i}
                className={`direction-step ${navigating && i < step ? 'done' : ''} ${navigating && i === step ? 'active' : ''}`}
              >
                <div className="step-number">
                  {navigating && i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span>{step_text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Action buttons */}
        <div className="modal-actions">
          {done ? (
            <div className="nav-done-msg">
              <CheckCircle size={18} color="#10b981" />
              <span>You've arrived at <strong>{zone.name}</strong>!</span>
            </div>
          ) : navigating ? (
            <div className="nav-progress-msg">
              <span className="nav-spinner" /> Navigating… Step {step} of {directions.length}
            </div>
          ) : (
            <button className="btn btn-primary w-full" onClick={handleStart}>
              <Navigation size={15} /> Start Navigation
            </button>
          )}
          <button className="btn btn-ghost btn-sm w-full" onClick={onClose} style={{ marginTop: 8 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
