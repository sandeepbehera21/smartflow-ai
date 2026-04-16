import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import OrderManagement from '../components/OrderManagement';
import StadiumMap from '../components/StadiumMap';
import { ZONES, triggerEmergency } from '../engine/simulationEngine';
import { useFirestoreCrowdData } from '../hooks/useFirestore';
import { createVenueUpdate } from '../services/firestoreService';

function getDensityColor(density) {
  if (density < 0.35) return '#10b981';
  if (density < 0.6) return '#06b6d4';
  if (density < 0.75) return '#f59e0b';
  if (density < 0.88) return '#f97316';
  return '#ef4444';
}

function getDensityLabel(density) {
  if (density < 0.35) return 'Clear';
  if (density < 0.6) return 'Moderate';
  if (density < 0.75) return 'Busy';
  if (density < 0.88) return 'High';
  return 'Critical';
}

function DensityRing({ value, size = 80, stroke = 8 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - value * circumference;
  const color = getDensityColor(value);

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={size * 0.18}
        fontFamily="Space Grotesk, sans-serif"
        fontWeight="700"
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

const MAX_HISTORY = 20;
let historyStore = [];

function addHistory(stats) {
  const entry = {
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    avgDensity: Math.round((stats.avgDensity || 0) * 100),
    maxDensity: Math.round((stats.maxDensity || 0) * 100),
    highRisk: stats.highRiskCount || 0,
  };
  historyStore = [...historyStore.slice(-(MAX_HISTORY - 1)), entry];
  return historyStore;
}

function buildZoneTableData(displayZones) {
  return Object.entries(ZONES)
    .filter(([id]) => id !== 'FIELD')
    .map(([id, zone]) => ({
      id,
      name: zone.name,
      type: zone.type,
      density: displayZones[id]?.density || 0,
      waitTime: displayZones[id]?.waitTime || 0,
      alert: displayZones[id]?.alert || false,
    }))
    .sort((a, b) => b.density - a.density);
}

export default function AdminDashboard({ data }) {
  const zones = data?.zones || {};
  const phase = data?.eventPhase || 'PRE_MATCH';
  const alerts = data?.alerts || [];
  const stats = data?.stats || {};
  const { crowdData } = useFirestoreCrowdData();

  const displayZones = crowdData?.zones || zones;
  const displayPhase = crowdData?.eventPhase || phase;
  const displayAlerts = crowdData?.alerts || alerts;
  const displayStats = crowdData?.stats || stats;
  const chartHistory = addHistory(displayStats);

  const [broadcastSent, setBroadcastSent] = useState(false);
  const [deployedZones, setDeployedZones] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const zoneTableData = buildZoneTableData(displayZones);
  const staffSuggestions = zoneTableData.filter((zone) => zone.density > 0.75).slice(0, 4);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleBroadcast = () => {
    setBroadcastSent(true);
    createVenueUpdate({
      title: 'Operations advisory issued',
      message: 'Operations asked attendees to follow venue signage and use lower-wait routes where available.',
      severity: 'warning',
      source: 'admin',
    });
    showToast('Operations advisory sent to attendee view.');
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const handleExport = () => {
    const csvRows = [
      ['Zone', 'Type', 'Density %', 'Wait Time (min)', 'Status'],
      ...zoneTableData.map((zone) => [
        zone.name,
        zone.type,
        Math.round(zone.density * 100),
        zone.waitTime,
        getDensityLabel(zone.density),
      ]),
    ];
    const csv = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `smartflow-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Operations report exported.');
  };

  const handleDeploy = (zoneName, zoneId) => {
    setDeployedZones((prev) => ({ ...prev, [zoneId]: true }));
    createVenueUpdate({
      title: 'Operations team deployed',
      message: `Staff have been reassigned to ${zoneName} to stabilize flow and wait times.`,
      severity: 'info',
      source: 'admin',
    });
    showToast(`Deployment logged for ${zoneName}.`);
  };

  return (
    <div className="admin-root">
      {toast && (
        <div className={`admin-toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Organizer Operations Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Arena Championship 2025 • <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>Live</span> • Phase: <strong style={{ color: 'var(--text-primary)' }}>{displayPhase.replace('_', ' ')}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleBroadcast} className={`btn ${broadcastSent ? 'btn-success' : 'btn-danger'}`}>
            {broadcastSent ? 'Advisory Sent' : 'Send Venue Advisory'}
          </button>
          <button className="btn btn-ghost" onClick={handleExport}>
            Export Ops Report
          </button>
        </div>
      </div>

      <div className="stat-grid-4" style={{ marginBottom: 24 }}>
        {[
          {
            label: 'Live Occupancy',
            value: `${Math.round((displayStats.avgDensity || 0) * 100)}%`,
            delta: displayStats.avgDensity > 0.6 ? 'Footfall rising' : 'Crowd flow stable',
            deltaType: displayStats.avgDensity > 0.6 ? 'up' : 'down',
          },
          {
            label: 'High-Risk Zones',
            value: displayStats.highRiskCount || 0,
            delta: displayStats.highRiskCount > 3 ? 'Escalation recommended' : 'Operationally stable',
            deltaType: displayStats.highRiskCount > 3 ? 'up' : 'down',
          },
          {
            label: 'Active Advisories',
            value: displayAlerts.length,
            delta: displayAlerts.length > 0 ? `${displayAlerts.filter((alert) => alert.severity === 'critical').length} critical` : 'No active interventions',
            deltaType: displayAlerts.length > 0 ? 'up' : 'down',
          },
          {
            label: 'Peak Queue Time',
            value: `${Math.max(...Object.values(displayZones).map((zone) => zone.waitTime || 0))} min`,
            delta: 'Longest live wait across venue',
            deltaType: 'down',
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-delta ${stat.deltaType}`}>{stat.delta}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: 'Decision Latency', value: '< 30s', note: 'From congestion spike to visible operator response.' },
          { label: 'Service Recovery', value: '2.4x', note: 'Faster queue rerouting in the live demo scenario.' },
          { label: 'Order Visibility', value: 'End-to-End', note: 'Attendee and operator views stay aligned on status changes.' },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {kpi.note}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Operational Impact</div>
        <div className="section-subtitle">
          SmartFlow AI helps venue teams spot crowd pressure earlier, coordinate food-service handoffs faster, and keep attendee messaging aligned with live operations from one command surface.
        </div>
      </div>

      {displayAlerts.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Live Advisories ({displayAlerts.length})
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {displayAlerts.map((alert) => (
              <div key={`${alert.zoneName}_${alert.message}`} className={`alert-banner ${alert.severity}`} style={{ flex: '1 0 240px' }}>
                {alert.severity === 'critical' ? 'RED' : 'WARN'} <strong>{alert.zoneName}</strong> • {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-main-grid">
        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div className="section-title">Digital Twin Overview</div>
            <div className="section-subtitle">Live crowd density and queue pressure model</div>
          </div>
          <StadiumMap zones={displayZones} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="section-title">Crowd Pressure Timeline</div>
              <div className="section-subtitle">Average occupancy and peak congestion over time</div>
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
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="avgDensity" stroke="#3b82f6" fill="url(#avgGrad)" strokeWidth={2} name="Avg Density" />
                <Area type="monotone" dataKey="maxDensity" stroke="#ef4444" fill="url(#maxGrad)" strokeWidth={2} name="Peak Density" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="section-title">Escalation Watchlist</div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartHistory.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="highRisk" fill="#f97316" radius={[4, 4, 0, 0]} name="High Risk Zones" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Zone Density Snapshot</div>
            <div className="section-subtitle">Current fill rate by operational zone</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-around' }}>
            {zoneTableData.slice(0, 8).map((zone) => (
              <div key={zone.id} style={{ textAlign: 'center', minWidth: 80 }}>
                <DensityRing value={zone.density} size={72} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 6, maxWidth: 80 }}>
                  {zone.name.split(' ').slice(-2).join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-bottom-grid">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="section-title">Full Zone Status Matrix</div>
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
                {zoneTableData.map((zone) => (
                  <tr key={zone.id}>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                        {zone.name}
                      </div>
                    </td>
                    <td>
                      <span className="tag" style={{ textTransform: 'capitalize' }}>{zone.type}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="density-bar" style={{ width: 60 }}>
                          <div className="density-bar-fill" style={{ width: `${zone.density * 100}%`, background: getDensityColor(zone.density) }} />
                        </div>
                        <span style={{ color: getDensityColor(zone.density), fontWeight: 600, fontSize: '0.85rem' }}>
                          {Math.round(zone.density * 100)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ color: zone.waitTime > 15 ? '#f59e0b' : 'var(--text-secondary)', fontWeight: 500 }}>
                      {zone.waitTime} min
                    </td>
                    <td>
                      <span className={`badge ${zone.alert ? 'badge-red' : zone.density > 0.6 ? 'badge-yellow' : 'badge-green'}`}>
                        {getDensityLabel(zone.density)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div className="section-title">Staff Allocation Guidance</div>
              <div className="section-subtitle">Recommended deployments based on live pressure</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staffSuggestions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '12px 0' }}>
                  No critical deployments recommended right now.
                </div>
              ) : (
                staffSuggestions.map((zone) => (
                  <div key={zone.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--bg-glass-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    border: `1px solid rgba(${zone.density > 0.88 ? '239,68,68' : '245,158,11'},.2)`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {Math.round(zone.density * 100)}% occupancy • Deploy {zone.density > 0.88 ? '4-6' : '2-3'} staff
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${deployedZones[zone.id] ? 'btn-success' : zone.density > 0.88 ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => handleDeploy(zone.name, zone.id)}
                      disabled={deployedZones[zone.id]}
                    >
                      {deployedZones[zone.id] ? 'Deployed' : 'Deploy Team'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(249,115,22,0.05) 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171', marginBottom: 8 }}>
              Emergency Controls
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Launch high-priority venue protocols and attendee guidance instantly.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-danger btn-sm w-full" onClick={() => triggerEmergency('EVACUATE IMMEDIATELY - Follow nearest exit signs.', 'critical')}>
                Initiate Evacuation Protocol
              </button>
              <button className="btn btn-ghost btn-sm w-full" onClick={() => triggerEmergency('SAFETY ALERT: Please remain seated and calm.', 'warning')}>
                Broadcast Safety Guidance
              </button>
              <button className="btn btn-ghost btn-sm w-full" onClick={() => triggerEmergency('Medical teams deployed. Make way for emergency staff.', 'critical')}>
                Dispatch Medical Response
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 12,
        }}>
          Food Service Control
        </div>
        <OrderManagement />
      </div>
    </div>
  );
}
