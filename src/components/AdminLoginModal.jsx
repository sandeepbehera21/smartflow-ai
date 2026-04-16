import { useState } from 'react';
import { X, Shield, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEMO_ADMIN_EMAIL =
  import.meta.env.VITE_DEMO_ADMIN_EMAIL ||
  import.meta.env.VITE_ADMIN_EMAILS?.split(',')[0]?.trim() ||
  'admin@smartflow.ai';
const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD_DISPLAY || '';

export default function AdminLoginModal({ onClose, onSuccess }) {
  const { loginAsAdmin, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const error = localError || authError;
  const hasDemoPassword = Boolean(DEMO_ADMIN_PASSWORD);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginAsAdmin(email.trim(), password);
      onSuccess?.();
      onClose();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail(DEMO_ADMIN_EMAIL);
    setPassword(DEMO_ADMIN_PASSWORD);
    setLocalError(null);
    clearError();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel admin-login-panel" role="dialog" aria-modal="true" aria-label="Admin Login">

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-icon" style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))',
              border: '1px solid rgba(139,92,246,0.3)',
            }}>
              <Shield size={20} color="#a78bfa" />
            </div>
            <div>
              <div className="modal-title">Admin Portal Access</div>
              <div className="modal-subtitle">Secure login for stadium organizers</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 20px' }}>

          {/* Error Alert */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 8,
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: 16,
              animation: 'slideInUp 0.2s ease',
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@smartflow.ai"
              autoComplete="email"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-glass-light)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  background: 'var(--bg-glass-light)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.9rem',
              gap: 8,
            }}
          >
            {isLoading ? (
              <>
                <div className="nav-spinner" style={{ width: 16, height: 16 }} />
                Authenticating...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In to Admin Portal
              </>
            )}
          </button>

          <div style={{
            marginTop: 16,
            padding: '12px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
          }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#93c5fd',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              Evaluator Demo Login
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div><strong style={{ color: 'var(--text-primary)' }}>Email:</strong> {DEMO_ADMIN_EMAIL}</div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Password:</strong>{' '}
                {hasDemoPassword ? DEMO_ADMIN_PASSWORD : 'Not configured in .env.local'}
              </div>
            </div>
            {hasDemoPassword && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={fillDemoCredentials}
                style={{ marginTop: 10, width: '100%' }}
              >
                Use Demo Credentials
              </button>
            )}
          </div>

          {/* Security Note */}
          <div style={{
            marginTop: 16,
            padding: '10px 12px',
            background: 'rgba(139, 92, 246, 0.06)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: 8,
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Shield size={14} color="#a78bfa" />
            <span>
              Protected by Firebase Authentication.
              Only authorized organizer accounts can access the Admin Dashboard.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
