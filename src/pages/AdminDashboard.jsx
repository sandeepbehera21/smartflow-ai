import { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import StadiumMap from '../components/StadiumMap';
import { ZONES, triggerEmergency } from '../engine/simulationEngine';

function getDensityColor(d) {
  if (d < 0.35) return '#10b981';
  if (d < 0.6)  return '#06b6d4';
  if (d < 0.75) return '#f59e0b';
  if (d < 0.88) return '#f97316';
  return '#ef4444';
}

function getDensityLabel(d) {
  if (d < 0.35) return 'Clear';
  if (d < 0.6)  return 'Moderate';
  if (d < 0.75) return 'Busy';
  if (d < 0.88) return 'High';
  return 'CRITICAL';
}

// Ring progress
function DensityRing({ value, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - value * circ;
  const color = getDensityColor(value);
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" />
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={color}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.18} fontFamily="Space Grotesk, sans-serif" fontWeight="700">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

// Tiny chart data history store (module-level)
const MAX_HISTORY = 20;
let historyStore = [];

function addHistory(stats, phase) {
  const entry = {
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    avgDensity: Math.round((stats.avgDensity || 0) * 100),
    maxDensity: Math.round((stats.maxDensity || 0) * 100),
    highRisk: stats.highRiskCount || 0,
  };
  historyStore = [...historyStore.slice(-(MAX_HISTORY - 1)), entry];
  return historyStore;
}

export default function AdminDashboard({ data }) {
  const zones = data?.zones || {};
  const phase = data?.eventPhase || 'PRE_MATCH';
  const alerts = data?.alerts || [];
  const stats = data?.stats || {};

  const chartHistory = addHistory(stats, phase);

  const [broadcastSent, setBroadcastSent] = useState(false);
  const [deployedZones, setDeployedZones] = useState({});
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const handleBroadcast = () => {
    setBroadcastSent(true);
    showToast('📢 Alert broadcasted to all stadium screens!');
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const handleExport = () => {
    const csvRows = [
      ['Zone', 'Type', 'Density %', 'Wait Time (min)', 'Status'],
      ...zoneTableData.map(z => [
        z.name, z.type,
        Math.round(z.density * 100),
        z.waitTime,
        z.density < 0.35 ? 'Clear' : z.density < 0.6 ? 'Moderate' : z.density < 0.75 ? 'Busy' : z.density < 0.88 ? 'High' : 'CRITICAL',
      ]),
    ];
    const csv = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartflow-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📊 Report exported as CSV!');
  };

  const handleDeploy = (zoneName, zoneId) => {
    setDeployedZones(prev => ({ ...prev, [zoneId]: true }));
    showToast(`👮 Staff deployed to ${zoneName}!`);
  };

  // Build zone table data
  const zoneTableData = Object.entries(ZONES)
    .filter(([id]) => id !== 'FIELD')
    .map(([id, zone]) => ({
      id, name: zone.name, type: zone.type,
      density: zones[id]?.density || 0,
      waitTime: zones[id]?.waitTime || 0,
      alert: zones[id]?.alert || false,
    }))
    .sort((a, b) => b.density - a.density);

  // Staff suggestions for high-density zones
  const staffSuggestions = zoneTableData.filter(z => z.density > 0.75).slice(0, 4);

  return (
    <div className="admin-root">

      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Organizer Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Arena Championship 2025 • <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>● Live</span> • Phase: <strong style={{ color: 'var(--text-primary)' }}>{phase.replace('_', ' ')}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleBroadcast} className={`btn ${broadcastSent ? 'btn-success' : 'btn-danger'}`}>
            {broadcastSent ? '✅ Alert Sent!' : '📢 Broadcast Alert'}
          </button>
          <button className="btn btn-ghost" onClick={handleExport}>
            ⬇ Export Report
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid-4" style={{ marginBottom: 24 }}>
        {[
          {
            label: 'Stadium Capacity',
            value: `${Math.round((stats.avgDensity || 0) * 100)}%`,
            delta: stats.avgDensity > 0.6 ? '▲ Increasing' : '▼ Stable',
            deltaType: stats.avgDensity > 0.6 ? 'up' : 'down',
          },
          {
            label: 'High-Risk Zones',
            value: stats.highRiskCount || 0,
            delta: stats.highRiskCount > 3 ? '⚠ Attention needed' : '● Under control',
            deltaType: stats.highRiskCount > 3 ? 'up' : 'down',
          },
          {
            label: 'Active Alerts',
            value: alerts.length,
            delta: alerts.length > 0 ? `${alerts.filter(a => a.severity === 'critical').length} critical` : 'All clear',
            deltaType: alerts.length > 0 ? 'up' : 'down',
          },
          {
            label: 'Peak Wait Time',
            value: `${Math.max(...Object.values(zones).map(z => z.waitTime || 0))} min`,
            delta: 'Max across all zones',
            deltaType: 'down',
          },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-delta ${s.deltaType}`}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Active Alerts Row */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            🚨 Live Alerts ({alerts.length})
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {alerts.map((a, i) => (
              <div key={i} className={`alert-banner ${a.severity}`} style={{ flex: '1 0 240px' }}>
                {a.severity === 'critical' ? '🔴' : '🟡'} <strong>{a.zoneName}</strong> — {a.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid – Map + Chart */}
      <div className="admin-main-grid">

        {/* Digital Twin Map */}
        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div className="section-title">🌐 Digital Twin View</div>
            <div className="section-subtitle">Real-time crowd density simulation</div>
          </div>
          <StadiumMap zones={zones} />
        </div>

        {/* Charts Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Crowd density over time */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="section-title">📈 Crowd Density Timeline</div>
              <div className="section-subtitle">Average & peak density over time</div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartHistory}>
                <defs>
                  <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="maxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="avgDensity" stroke="#3b82f6" fill="url(#avgGrad)" strokeWidth={2} name="Avg Density" />
                <Area type="monotone" dataKey="maxDensity" stroke="#ef4444" fill="url(#maxGrad)" strokeWidth={2} name="Peak Density" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* High-risk zones bar */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="section-title">⚠️ High-Risk Zone Count</div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartHistory.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="highRisk" fill="#f97316" radius={[4,4,0,0]} name="High Risk Zones" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Zone Density Rings */}
      <div style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">🎯 Zone Density Overview</div>
            <div className="section-subtitle">Current fill rate per zone</div>
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 16,
            justifyContent: 'space-around',
          }}>
            {zoneTableData.slice(0, 8).map(z => (
              <div key={z.id} style={{ textAlign: 'center', minWidth: 80 }}>
                <DensityRing value={z.density} size={72} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 6, maxWidth: 80 }}>
                  {z.name.split(' ').slice(-2).join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Table + Staff Suggestions */}
      <div className="admin-bottom-grid">

        {/* Full Zone Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="section-title">📋 All Zone Status</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="zone-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Type</th>
                  <th>Density</th>
                  <th>Wait</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {zoneTableData.map(z => (
                  <tr key={z.id}>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                        {z.name}
                      </div>
                    </td>
                    <td>
                      <span className="tag" style={{ textTransform: 'capitalize' }}>{z.type}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="density-bar" style={{ width: 60 }}>
                          <div className="density-bar-fill" style={{
                            width: `${z.density * 100}%`,
                            background: getDensityColor(z.density),
                          }} />
                        </div>
                        <span style={{ color: getDensityColor(z.density), fontWeight: 600, fontSize: '0.85rem' }}>
                          {Math.round(z.density * 100)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ color: z.waitTime > 15 ? '#f59e0b' : 'var(--text-secondary)', fontWeight: 500 }}>
                      {z.waitTime} min
                    </td>
                    <td>
                      <span className={`badge ${z.alert ? 'badge-red' : z.density > 0.6 ? 'badge-yellow' : 'badge-green'}`}>
                        {getDensityLabel(z.density)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Suggestions + Safety */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div className="section-title">👥 Staff Allocation</div>
              <div className="section-subtitle">AI-suggested deployments</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staffSuggestions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '12px 0' }}>
                  ✅ No critical zones — all zones under control
                </div>
              ) : (
                staffSuggestions.map(z => (
                  <div key={z.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--bg-glass-light)', borderRadius: 'var(--radius-md)',
                    padding: '10px 14px', border: `1px solid rgba(${z.density > 0.88 ? '239,68,68' : '245,158,11'},.2)`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{z.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {Math.round(z.density * 100)}% — Deploy {z.density > 0.88 ? '4-6' : '2-3'} staff
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${deployedZones[z.id] ? 'btn-success' : z.density > 0.88 ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => handleDeploy(z.name, z.id)}
                      disabled={deployedZones[z.id]}
                    >
                      {deployedZones[z.id] ? '✅ Deployed' : 'Deploy'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Emergency Panel */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(249,115,22,0.05) 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171', marginBottom: 8 }}>
              🚨 Emergency Controls
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Activate emergency protocols & evacuation routes instantly.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-danger btn-sm w-full" onClick={() => triggerEmergency('EVACUATE IMMEDIATELY - Follow nearest exit signs.', 'critical')}>
                🔴 Initiate Evacuation Protocol
              </button>
              <button className="btn btn-ghost btn-sm w-full" onClick={() => triggerEmergency('SAFETY ALERT: Please remain seated and calm.', 'warning')}>
                📢 Broadcast Safety Message
              </button>
              <button className="btn btn-ghost btn-sm w-full" onClick={() => triggerEmergency('Medical teams deployed. Make way for emergency staff.', 'critical')}>
                🏥 Alert Medical Teams
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
