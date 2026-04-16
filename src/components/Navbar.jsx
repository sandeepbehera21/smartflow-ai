import { useState } from 'react';
import { Bell, Shield, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AdminLoginModal from './AdminLoginModal';
import '../styles/navbar.css';

const PHASE_STYLES = {
  PRE_MATCH:  { label: 'Pre-Match',  class: 'badge-blue' },
  MATCH:      { label: 'Live Match', class: 'badge-green' },
  HALF_TIME:  { label: 'Half Time',  class: 'badge-yellow' },
  POST_MATCH: { label: 'Post-Match', class: 'badge-purple' },
};

export default function Navbar({ activeView, onViewChange, data }) {
  const alerts = data?.alerts || [];
  const phase = data?.eventPhase || 'PRE_MATCH';
  const ps = PHASE_STYLES[phase] || PHASE_STYLES.PRE_MATCH;
  const [showAlerts, setShowAlerts] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { isAdmin, userEmail, logout, loading } = useAuth();

  const handleViewToggle = () => {
    if (activeView === 'attendee') {
      // Trying to go to admin
      if (isAdmin) {
        onViewChange('admin');
      } else {
        setShowLoginModal(true);
      }
    } else {
      // Going back to attendee
      onViewChange('attendee');
    }
  };

  const handleLoginSuccess = () => {
    onViewChange('admin');
  };

  const handleLogout = async () => {
    if (activeView === 'admin') {
      onViewChange('attendee');
    }
    await logout();
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">⚡</div>
          <div>
            <div className="navbar-logo-text">SmartFlow AI</div>
            <div className="navbar-logo-sub">Stadium Intelligence System</div>
          </div>
        </div>

        <div className="navbar-right">
          <div className="live-indicator">
            <div className="pulse-dot green" />
            LIVE
          </div>

          <span className={`badge event-phase-badge ${ps.class}`}>
            {ps.label}
          </span>

          {/* View Toggle / Admin Portal button */}
          <button 
            className="btn btn-ghost btn-sm"
            onClick={handleViewToggle}
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {activeView === 'attendee' ? (
              <>
                <Shield size={14} />
                Admin Portal
              </>
            ) : (
              '🏟️ Attendee App'
            )}
          </button>

          {/* Admin Badge / Logout */}
          {isAdmin && (
            <div className="admin-auth-badge">
              <div className="admin-auth-info">
                <Shield size={12} />
                <span className="admin-auth-email">
                  {userEmail || 'Admin'}
                </span>
              </div>
              <button
                className="admin-logout-btn"
                onClick={handleLogout}
                title="Sign out of admin"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          {/* Anonymous User Badge (subtle) */}
          {!isAdmin && !loading && (
            <div className="attendee-auth-badge" title={`Signed in anonymously`}>
              <User size={13} />
            </div>
          )}

          {/* Alerts Bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="alert-btn"
              onClick={() => setShowAlerts(v => !v)}
              title="View alerts"
            >
              <Bell size={18} />
              {alerts.length > 0 && (
                <span className="alert-count">{alerts.length}</span>
              )}
            </button>

            {showAlerts && (
              <div style={{
                position: 'absolute', right: 0, top: 48, width: 300,
                background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                zIndex: 300, padding: 12, animation: 'slideInDown 0.2s ease',
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active Alerts
                </div>
                {alerts.length === 0 ? (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '8px 0' }}>
                    ✅ No alerts at this time
                  </div>
                ) : (
                  alerts.map((a, i) => (
                    <div key={i} className={`alert-banner ${a.severity}`} style={{ marginBottom: 6 }}>
                      {a.severity === 'critical' ? '🔴' : '🟡'} {a.message}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <AdminLoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}
