// SmartFlow AI - Crowd Simulation Engine
// Generates realistic, real-time stadium crowd & queue data

import { writeCrowdData } from '../services/firestoreService';

export const ZONES = {
  GATE_A: { id: 'GATE_A', name: 'Gate A - Main Entry', type: 'entry', x: 50, y: 10 },
  GATE_B: { id: 'GATE_B', name: 'Gate B - East Entry', type: 'entry', x: 85, y: 40 },
  GATE_C: { id: 'GATE_C', name: 'Gate C - West Entry', type: 'entry', x: 15, y: 40 },
  GATE_D: { id: 'GATE_D', name: 'Gate D - South Entry', type: 'entry', x: 50, y: 85 },
  FOOD_A: { id: 'FOOD_A', name: 'Food Court Alpha', type: 'food', x: 25, y: 25 },
  FOOD_B: { id: 'FOOD_B', name: 'Food Court Beta', type: 'food', x: 75, y: 25 },
  FOOD_C: { id: 'FOOD_C', name: 'Food Court Gamma', type: 'food', x: 50, y: 70 },
  REST_N: { id: 'REST_N', name: 'Restrooms North', type: 'restroom', x: 50, y: 20 },
  REST_E: { id: 'REST_E', name: 'Restrooms East', type: 'restroom', x: 80, y: 55 },
  REST_W: { id: 'REST_W', name: 'Restrooms West', type: 'restroom', x: 20, y: 55 },
  REST_S: { id: 'REST_S', name: 'Restrooms South', type: 'restroom', x: 50, y: 75 },
  STAND_N: { id: 'STAND_N', name: 'North Stand', type: 'seating', x: 50, y: 30 },
  STAND_E: { id: 'STAND_E', name: 'East Stand', type: 'seating', x: 70, y: 50 },
  STAND_W: { id: 'STAND_W', name: 'West Stand', type: 'seating', x: 30, y: 50 },
  STAND_S: { id: 'STAND_S', name: 'South Stand', type: 'seating', x: 50, y: 65 },
  VIP_BOX: { id: 'VIP_BOX', name: 'VIP Box Level', type: 'vip', x: 50, y: 45 },
  MERCH:   { id: 'MERCH', name: 'Merchandise Store', type: 'merch', x: 35, y: 80 },
  MEDIC:   { id: 'MEDIC', name: 'Medical Center', type: 'medical', x: 65, y: 80 },
  FIELD:   { id: 'FIELD', name: 'Playing Field', type: 'field', x: 50, y: 50 },
};

let state = {};

function initState() {
  Object.keys(ZONES).forEach(id => {
    state[id] = {
      density: Math.random() * 0.4,    // 0-1 (0=empty, 1=packed)
      waitTime: Math.floor(Math.random() * 8), // minutes
      alert: false,
      trend: Math.random() > 0.5 ? 1 : -1,
    };
  });
  // Field is always cleared
  state['FIELD'] = { density: 0, waitTime: 0, alert: false, trend: 0 };
}

initState();

// Simulate crowd event phases
let eventPhase = 'PRE_MATCH'; // PRE_MATCH | MATCH | HALF_TIME | POST_MATCH
let phaseTimer = 0;
const PHASE_DURATIONS = { PRE_MATCH: 120, MATCH: 300, HALF_TIME: 60, POST_MATCH: 180 };

const crowdPatterns = {
  PRE_MATCH: {
    GATE_A: 0.8, GATE_B: 0.7, GATE_C: 0.6, GATE_D: 0.5,
    FOOD_A: 0.5, FOOD_B: 0.4, FOOD_C: 0.3,
    STAND_N: 0.3, STAND_E: 0.35, STAND_W: 0.3, STAND_S: 0.3,
  },
  MATCH: {
    GATE_A: 0.2, GATE_B: 0.15, GATE_C: 0.1, GATE_D: 0.1,
    FOOD_A: 0.3, FOOD_B: 0.35, FOOD_C: 0.25,
    STAND_N: 0.95, STAND_E: 0.9, STAND_W: 0.92, STAND_S: 0.88,
  },
  HALF_TIME: {
    GATE_A: 0.1, GATE_B: 0.1, GATE_C: 0.1, GATE_D: 0.1,
    FOOD_A: 0.95, FOOD_B: 0.9, FOOD_C: 0.85,
    REST_N: 0.9, REST_E: 0.85, REST_W: 0.8, REST_S: 0.75,
    STAND_N: 0.3, STAND_E: 0.3, STAND_W: 0.3, STAND_S: 0.3,
  },
  POST_MATCH: {
    GATE_A: 0.95, GATE_B: 0.9, GATE_C: 0.85, GATE_D: 0.8,
    FOOD_A: 0.4, FOOD_B: 0.3, FOOD_C: 0.35,
    STAND_N: 0.1, STAND_E: 0.1, STAND_W: 0.1, STAND_S: 0.1,
  },
};

const subscribers = new Set();

let emergencyAlerts = [];

export function triggerEmergency(message, severity = 'critical') {
  emergencyAlerts.push({
    severity,
    message,
    isEmergency: true,
    zoneName: 'GLOBAL ALERT',
  });
  notify();
}

export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notify() {
  const snapshot = getSnapshot();
  subscribers.forEach(cb => cb(snapshot));
  
  // Write to Firestore for real-time synchronization
  writeCrowdData(snapshot).catch(() => {});
}

export function getSnapshot() {
  return {
    zones: { ...state },
    eventPhase,
    timestamp: Date.now(),
    alerts: getAlerts(),
    stats: getStats(),
  };
}

function getAlerts() {
  const alerts = [...emergencyAlerts];
  return alerts.concat(Object.entries(state)
    .filter(([, z]) => z.density > 0.85)
    .map(([id]) => ({
      zoneId: id,
      zoneName: ZONES[id]?.name || id,
      severity: state[id].density > 0.92 ? 'critical' : 'warning',
      message: `High congestion detected at ${ZONES[id]?.name || id}`,
    })));
}

function getStats() {
  const densities = Object.values(state).map(z => z.density);
  const maxDensity = Math.max(...densities);
  const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
  const highRiskCount = densities.filter(d => d > 0.75).length;
  return { maxDensity, avgDensity, highRiskCount, totalZones: densities.length };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Main simulation tick
export function tick() {
  phaseTimer++;
  if (phaseTimer > PHASE_DURATIONS[eventPhase]) {
    phaseTimer = 0;
    const phases = ['PRE_MATCH', 'MATCH', 'HALF_TIME', 'POST_MATCH'];
    const idx = phases.indexOf(eventPhase);
    eventPhase = phases[(idx + 1) % phases.length];
  }

  const targets = crowdPatterns[eventPhase] || {};

  Object.keys(ZONES).forEach(id => {
    if (id === 'FIELD') return;
    const target = targets[id] ?? 0.2;
    const noise = (Math.random() - 0.5) * 0.08;
    const current = state[id].density;
    const newDensity = Math.max(0, Math.min(1, lerp(current, target + noise, 0.12)));
    const waitTime = Math.round(newDensity * 30);
    const alert = newDensity > 0.85;
    state[id] = { ...state[id], density: newDensity, waitTime, alert };
  });

  notify();
}

// AI Recommendation Engine
export function getRecommendations(userZone = 'STAND_N') {
  const recs = [];

  // Best food court
  const foodZones = ['FOOD_A', 'FOOD_B', 'FOOD_C'];
  const bestFood = foodZones.reduce((best, zid) =>
    state[zid].density < state[best].density ? zid : best
  );
  recs.push({
    type: 'food',
    icon: '🍔',
    title: 'Best Food Court Right Now',
    description: `${ZONES[bestFood].name} has the shortest wait (~${state[bestFood].waitTime} min)`,
    action: 'Navigate',
    urgency: state[bestFood].density < 0.4 ? 'low' : 'medium',
    zoneId: bestFood,
  });

  // Best restroom
  const restZones = ['REST_N', 'REST_E', 'REST_W', 'REST_S'];
  const bestRest = restZones.reduce((best, zid) =>
    state[zid].density < state[best].density ? zid : best
  );
  recs.push({
    type: 'restroom',
    icon: '🚻',
    title: 'Nearest Available Restroom',
    description: `${ZONES[bestRest].name} – ~${state[bestRest].waitTime} min wait`,
    action: 'Navigate',
    urgency: state[bestRest].density < 0.5 ? 'low' : 'high',
    zoneId: bestRest,
  });

  // Best exit
  if (eventPhase === 'POST_MATCH' || eventPhase === 'HALF_TIME') {
    const gateZones = ['GATE_A', 'GATE_B', 'GATE_C', 'GATE_D'];
    const bestGate = gateZones.reduce((best, gid) =>
      state[gid].density < state[best].density ? gid : best
    );
    recs.push({
      type: 'exit',
      icon: '🚪',
      title: 'Recommended Exit',
      description: `Use ${ZONES[bestGate].name} – currently ${Math.round(state[bestGate].density * 100)}% capacity`,
      action: 'Route',
      urgency: 'high',
      zoneId: bestGate,
    });
  }

  // Seat suggestion
  if (eventPhase === 'PRE_MATCH') {
    recs.push({
      type: 'seat',
      icon: '🏟️',
      title: 'Head to Your Seat Soon',
      description: `Gates are filling up fast. Entry is smoother if you head in now.`,
      action: 'Route',
      urgency: 'medium',
      zoneId: userZone,
    });
  }

  return recs;
}

export function getChatResponse(message) {
  const msg = message.toLowerCase();

  if (msg.includes('food') || msg.includes('eat') || msg.includes('hungry')) {
    const foodZones = ['FOOD_A', 'FOOD_B', 'FOOD_C'];
    const best = foodZones.reduce((a, b) => state[a].density < state[b].density ? a : b);
    return `🍔 Best food option right now is **${ZONES[best].name}** — estimated wait is only **${state[best].waitTime} minutes**! Head there now while it's quiet.`;
  }

  if (msg.includes('restroom') || msg.includes('toilet') || msg.includes('bathroom') || msg.includes('washroom')) {
    const restZones = ['REST_N', 'REST_E', 'REST_W', 'REST_S'];
    const best = restZones.reduce((a, b) => state[a].density < state[b].density ? a : b);
    return `🚻 The **${ZONES[best].name}** has the shortest queue right now (~${state[best].waitTime} min). I'd recommend going there. Avoid ${restZones.filter(z => z !== best)[0] ? ZONES[restZones.filter(z => z !== best)[0]].name : 'the others'} — it's packed!`;
  }

  if (msg.includes('exit') || msg.includes('leave') || msg.includes('out')) {
    const gateZones = ['GATE_A', 'GATE_B', 'GATE_C', 'GATE_D'];
    const best = gateZones.reduce((a, b) => state[a].density < state[b].density ? a : b);
    return `🚪 For the quickest exit, head to **${ZONES[best].name}** — it's at **${Math.round(state[best].density * 100)}% capacity**. Leaving 5 minutes before the final whistle will also save significant time!`;
  }

  if (msg.includes('crowd') || msg.includes('congestion') || msg.includes('busy')) {
    const alerts = getAlerts();
    if (alerts.length === 0) {
      return `✅ Great news! No major congestion anywhere in the stadium right now. All zones are flowing smoothly.`;
    }
    return `🔴 There are **${alerts.length} high-congestion zone(s)** right now: ${alerts.map(a => a.zoneName).join(', ')}. I recommend avoiding these areas for the next 10-15 minutes.`;
  }

  if (msg.includes('safe') || msg.includes('emergency') || msg.includes('help') || msg.includes('danger')) {
    return `🚨 If this is an emergency, please contact the nearest staff member immediately or call stadium security at **#EMERGENCY**. Follow the illuminated signs for the nearest exit. Stay calm and move steadily.`;
  }

  if (msg.includes('wait') || msg.includes('queue') || msg.includes('time')) {
    const snap = getSnapshot();
    const maxWait = Math.max(...Object.values(snap.zones).map(z => z.waitTime));
    return `⏱️ Current max wait time anywhere in the stadium is **${maxWait} minutes** (${eventPhase.replace('_', ' ')}). The quietest spots are currently the lower-congestion food courts and side restrooms.`;
  }

  if (msg.includes('phase') || msg.includes('match') || msg.includes('halftime') || msg.includes('half time')) {
    return `🏟️ We are currently in the **${eventPhase.replace('_', ' ')}** phase. ${
      eventPhase === 'HALF_TIME' ? 'Half-time lasts about 15 minutes — a great time to grab food early before the rush hits!' :
      eventPhase === 'PRE_MATCH' ? 'Match kicks off soon! Head to your seat in the next few minutes for the best experience.' :
      eventPhase === 'POST_MATCH' ? 'The match has ended. For a smooth exit, I recommend waiting 10 minutes before leaving.' :
      'Enjoy the match! Best time to visit facilities is during a break in play.'
    }`;
  }

  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
    return `👋 Hi there! I'm **FlowBot**, your AI stadium assistant. I can help you find the shortest queues, best exits, food recommendations, and real-time crowd info. What do you need?`;
  }

  return `🤔 I'm not sure about that specific query. I can help with: **food courts, restrooms, exits, crowd congestion, wait times, and safety**. Try asking something like "Where's the best food right now?" or "Which exit is least crowded?"`;
}

export { eventPhase };
