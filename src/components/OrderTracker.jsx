import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, ChefHat, AlertCircle, Bell, Package } from 'lucide-react';
import { useMyOrders } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';

function getStatusConfig(status) {
  const configs = {
    PENDING: {
      icon: Clock,
      label: 'Order Placed',
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.1)',
      step: 0,
    },
    PREPARING: {
      icon: ChefHat,
      label: '🍳 Preparing',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      step: 1,
    },
    READY: {
      icon: CheckCircle,
      label: '✅ Ready for Pickup!',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      step: 2,
    },
    COMPLETED: {
      icon: Package,
      label: 'Picked Up',
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      step: 3,
    },
    CANCELLED: {
      icon: AlertCircle,
      label: 'Cancelled',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      step: -1,
    },
  };
  return configs[status] || configs.PENDING;
}

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp?.toDate?.() || new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getElapsedTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toDate?.() || new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 60000); // minutes
  return diff;
}

// ── Progress Stepper Component ──────────────────────────────────
function OrderProgressStepper({ status }) {
  const config = getStatusConfig(status);
  const currentStep = config.step;

  const steps = [
    { label: 'Placed', icon: '📋', step: 0 },
    { label: 'Preparing', icon: '👨‍🍳', step: 1 },
    { label: 'Ready', icon: '✅', step: 2 },
    { label: 'Picked Up', icon: '🎉', step: 3 },
  ];

  if (status === 'CANCELLED') {
    return (
      <div style={{
        padding: '8px 12px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 6,
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#ef4444',
      }}>
        ⛔ Order has been cancelled
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
      }}>
        {/* Progress Line (background) */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 20,
          right: 20,
          height: 3,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          zIndex: 0,
        }} />

        {/* Progress Line (filled) */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 20,
          width: `${Math.min(100, (currentStep / (steps.length - 1)) * 100)}%`,
          maxWidth: 'calc(100% - 40px)',
          height: 3,
          background: `linear-gradient(90deg, ${config.color}, ${config.color}80)`,
          borderRadius: 2,
          zIndex: 1,
          transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: `0 0 8px ${config.color}40`,
        }} />

        {/* Step Dots */}
        {steps.map((s, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div key={s.label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              zIndex: 2,
              flex: 1,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                transition: 'all 0.5s ease',
                background: isDone
                  ? `${config.color}20`
                  : isActive
                    ? `${config.color}30`
                    : 'rgba(255,255,255,0.04)',
                border: isDone || isActive
                  ? `2px solid ${config.color}`
                  : '2px solid rgba(255,255,255,0.1)',
                boxShadow: isActive ? `0 0 12px ${config.color}40` : 'none',
                animation: isActive ? 'pulse-ring 2s infinite' : 'none',
              }}>
                {isDone ? '✓' : s.icon}
              </div>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: isDone || isActive ? 600 : 400,
                color: isDone || isActive ? config.color : '#64748b',
                textAlign: 'center',
                transition: 'color 0.5s ease',
              }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Toast Notification Component ──────────────────────────────
function OrderToast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const styles = {
    PREPARING: {
      bg: 'linear-gradient(135deg, #d97706, #f59e0b)',
      icon: '👨‍🍳',
      label: 'Your order is being prepared!',
    },
    READY: {
      bg: 'linear-gradient(135deg, #059669, #10b981)',
      icon: '🎉',
      label: 'Your order is ready for pickup!',
    },
    COMPLETED: {
      bg: 'linear-gradient(135deg, #4b5563, #6b7280)',
      icon: '✅',
      label: 'Order completed. Enjoy!',
    },
    CANCELLED: {
      bg: 'linear-gradient(135deg, #dc2626, #ef4444)',
      icon: '❌',
      label: 'Your order has been cancelled.',
    },
  };

  const s = styles[type] || styles.PREPARING;

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 24,
      zIndex: 1000,
      padding: '14px 20px',
      borderRadius: 12,
      background: s.bg,
      color: 'white',
      fontWeight: 600,
      fontSize: '0.9rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      animation: 'slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      cursor: 'pointer',
      maxWidth: 360,
    }} onClick={onDismiss}>
      <Bell size={18} />
      <div>
        <div style={{ fontSize: '0.75rem', opacity: 0.85, marginBottom: 2 }}>Order Update</div>
        <div>{s.icon} {message || s.label}</div>
      </div>
    </div>
  );
}

// ── Main OrderTracker Component ──────────────────────────────
export default function OrderTracker() {
  const { userId } = useAuth();
  const [toast, setToast] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [, setElapsedTick] = useState(0);

  // Callback fired when any order's status changes
  const handleStatusChange = useCallback((order, prevStatus, newStatus) => {
    const shortId = order.orderId.slice(-6);
    const messages = {
      PREPARING: `Order #${shortId} is being prepared!`,
      READY: `Order #${shortId} is ready at ${order.foodCourt}!`,
      COMPLETED: `Order #${shortId} picked up. Enjoy!`,
      CANCELLED: `Order #${shortId} has been cancelled.`,
    };
    setToast({
      message: messages[newStatus] || `Order #${shortId} updated to ${newStatus}`,
      type: newStatus,
    });
  }, []);

  const { orders, loading } = useMyOrders(userId, handleStatusChange);

  // Tick every 30s to update elapsed time display
  useEffect(() => {
    const interval = setInterval(() => setElapsedTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Sort orders: active first, then by creation time
  const sortedOrders = [...orders].sort((a, b) => {
    const statusOrder = { READY: 0, PREPARING: 1, PENDING: 2, COMPLETED: 3, CANCELLED: 4 };
    const aDone = (statusOrder[a.status] ?? 99);
    const bDone = (statusOrder[b.status] ?? 99);
    if (aDone !== bDone) return aDone - bDone;
    // Newer first within same status
    const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
    const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
    return bTime - aTime;
  });

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
        <div className="nav-spinner" style={{ margin: '0 auto 10px' }} />
        Loading your orders...
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.9rem',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🛒</div>
        No active orders yet. Place an order from any food court to start tracking it here.
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <OrderToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedOrders.map((order) => {
          const orderKey = order.id || order.orderId;
          const config = getStatusConfig(order.status);
          const StatusIcon = config.icon;
          const isExpanded = expandedOrder === orderKey;
          const isReady = order.status === 'READY';
          const isActive = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
          const elapsed = getElapsedTime(order.createdAt);

          return (
            <div
              key={orderKey}
              style={{
                background: isReady
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)'
                  : config.bgColor,
                border: `1px solid ${isReady ? 'rgba(16,185,129,0.4)' : config.color}`,
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                animation: isReady ? 'glow-pulse-green 2s infinite' : 'none',
              }}
              onClick={() => setExpandedOrder(isExpanded ? null : orderKey)}
            >
              {/* ── Order Header ── */}
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `${config.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}>
                    <StatusIcon size={20} color={config.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: config.color,
                    }}>
                      {config.label}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                    }}>
                      Order #{order.orderId.slice(-6)} • {order.foodCourt}
                      {isActive && elapsed > 0 && (
                        <span style={{ marginLeft: 6, color: elapsed > order.estimatedTime ? '#f59e0b' : '#64748b' }}>
                          • {elapsed}m elapsed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isReady && (
                  <div style={{
                    background: '#10b981',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    animation: 'pulse-badge 1.5s infinite',
                  }}>
                    🎉 Ready!
                  </div>
                )}

                <div style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}>
                  {formatTime(order.createdAt)}
                </div>
              </div>

              {/* ── Progress Stepper (always visible for active orders) ── */}
              {isActive && (
                <div style={{ padding: '0 16px 8px' }}>
                  <OrderProgressStepper status={order.status} />
                </div>
              )}

              {/* ── Expanded Details ── */}
              {isExpanded && (
                <div style={{
                  borderTop: `1px solid ${config.color}40`,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.05) 0%, rgba(30,41,59,0.5) 100%)',
                  animation: 'slideInUp 0.2s ease',
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                      marginBottom: 8,
                      fontWeight: 600,
                    }}>
                      Order Items
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {order.items.map((item, idx) => (
                        <div
                          key={`${orderKey}_${item.id || item.name}_${idx}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                            padding: '6px 8px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: 4,
                          }}
                        >
                          <span>
                            {item.emoji} {item.name} <span style={{ color: '#94a3b8' }}>×{item.qty}</span>
                          </span>
                          <span style={{ color: '#94a3b8' }}>${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    padding: '8px 0',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span>Total</span>
                    <span>${order.totalPrice.toFixed(2)}</span>
                  </div>

                  <div style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    marginTop: 12,
                    padding: '8px 8px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span>⏱️ Est. prep time: {order.estimatedTime} min</span>
                    {isActive && elapsed > 0 && (
                      <span style={{ color: elapsed > order.estimatedTime ? '#f59e0b' : '#10b981' }}>
                        {elapsed > order.estimatedTime
                          ? `⚠️ ${elapsed - order.estimatedTime}m overdue`
                          : `${order.estimatedTime - elapsed}m remaining`
                        }
                      </span>
                    )}
                  </div>

                  {isReady && (
                    <div style={{
                      marginTop: 12,
                      padding: '12px 8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: 4,
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: '#10b981',
                      fontWeight: 600,
                    }}>
                      🎉 Your order is ready for pickup at {order.foodCourt}!
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
