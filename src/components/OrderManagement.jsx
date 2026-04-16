import { useState } from 'react';
import { Bell, CheckCircle, ChefHat, Clock, X } from 'lucide-react';
import { useActiveOrders } from '../hooks/useFirestore';
import { createVenueUpdate, updateOrderStatus } from '../services/firestoreService';

function getStatusBadge(status) {
  const badges = {
    PENDING: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4', label: 'Pending Intake' },
    PREPARING: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'In Preparation' },
    READY: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: 'Ready for Collection' },
  };
  return badges[status] || badges.PENDING;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp?.toDate?.() || new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ActionButton({ label, onClick, isUpdating, style }) {
  return (
    <button
      onClick={onClick}
      disabled={isUpdating}
      style={{
        padding: '6px 14px',
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: isUpdating ? 'wait' : 'pointer',
        opacity: isUpdating ? 0.5 : 1,
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {label}
    </button>
  );
}

function OrderCard({ order, onSelect, isSelected, onStatusChange, isUpdating, canComplete }) {
  const badge = getStatusBadge(order.status);
  const elapsed = formatTimeAgo(order.createdAt);

  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.02)',
        border: isSelected ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: 8,
        padding: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{
              background: badge.bg,
              color: badge.text,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              {badge.label}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
              Order #{order.orderId.slice(-6)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              @ {order.foodCourt}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {elapsed}
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''} • ${order.totalPrice.toFixed(2)} • ~{order.estimatedTime} min prep
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {order.status === 'PENDING' && (
            <ActionButton
              label={isUpdating ? '⏳' : 'Accept & Start'}
              onClick={(event) => {
                event.stopPropagation();
                onStatusChange('PREPARING');
              }}
              isUpdating={isUpdating}
              style={{
                background: 'rgba(250, 204, 21, 0.2)',
                border: '1px solid rgba(250, 204, 21, 0.4)',
                color: '#fbbf24',
              }}
            />
          )}

          {order.status === 'PREPARING' && (
            <ActionButton
              label={isUpdating ? '⏳' : 'Mark Ready'}
              onClick={(event) => {
                event.stopPropagation();
                onStatusChange('READY');
              }}
              isUpdating={isUpdating}
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
              }}
            />
          )}

          {canComplete && order.status === 'READY' && (
            <ActionButton
              label={isUpdating ? '⏳' : 'Complete Pickup'}
              onClick={(event) => {
                event.stopPropagation();
                onStatusChange('COMPLETED');
              }}
              isUpdating={isUpdating}
              style={{
                background: 'rgba(107, 114, 128, 0.2)',
                border: '1px solid rgba(107, 114, 128, 0.4)',
                color: '#9ca3af',
              }}
            />
          )}

          {order.status === 'PENDING' && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                if (window.confirm(`Cancel order #${order.orderId.slice(-6)}?`)) {
                  onStatusChange('CANCELLED');
                }
              }}
              disabled={isUpdating}
              style={{
                padding: '6px 8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                borderRadius: 6,
                fontSize: '0.75rem',
                cursor: isUpdating ? 'wait' : 'pointer',
                opacity: isUpdating ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
              title="Cancel order"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isSelected && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          animation: 'slideInUp 0.2s ease',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
            ORDER ITEMS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {order.items.map((item, index) => (
              <div key={`${order.orderId}_${item.id || item.name}_${index}`} style={{
                fontSize: '0.8rem',
                display: 'flex',
                justifyContent: 'space-between',
                color: '#cbd5e1',
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 4,
              }}>
                <span>{item.emoji} {item.name} x{item.qty}</span>
                <span style={{ color: '#94a3b8' }}>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}>
            <span>Total</span>
            <span>${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderSection({
  title,
  color,
  icon,
  orders,
  selectedOrder,
  setSelectedOrder,
  handleStatusUpdate,
  updating,
  canComplete = false,
}) {
  return (
    <div>
      <div style={{
        fontSize: '0.85rem',
        fontWeight: 600,
        color,
        textTransform: 'uppercase',
        marginBottom: 12,
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {icon}
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map((order) => {
          const orderKey = order.id || order.orderId;
          return (
            <OrderCard
              key={orderKey}
              order={order}
              onSelect={() => setSelectedOrder(selectedOrder === orderKey ? null : orderKey)}
              isSelected={selectedOrder === orderKey}
              onStatusChange={(status) => handleStatusUpdate(orderKey, status)}
              isUpdating={updating[orderKey]}
              canComplete={canComplete}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function OrderManagement() {
  const { orders, loading, newOrderAlert } = useActiveOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState({});
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [orderId]: true }));
    try {
      await updateOrderStatus(orderId, newStatus);
      const order = orders.find((entry) => entry.id === orderId || entry.orderId === orderId);
      const shortId = orderId.slice(-6);
      createVenueUpdate({
        title: `Order #${shortId} updated`,
        message: order
          ? `${order.foodCourt} marked order #${shortId} as ${newStatus}.`
          : `Operations updated order #${shortId} to ${newStatus}.`,
        severity: newStatus === 'READY' ? 'success' : newStatus === 'CANCELLED' ? 'critical' : 'info',
        source: 'admin',
      });
      showToast(`Order ${shortId} -> ${newStatus}`);
    } catch {
      showToast('Order update could not be completed');
    } finally {
      setUpdating((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const pendingOrders = orders.filter((order) => order.status === 'PENDING');
  const preparingOrders = orders.filter((order) => order.status === 'PREPARING');
  const readyOrders = orders.filter((order) => order.status === 'READY');
  const filteredOrders = filter === 'ALL' ? orders : orders.filter((order) => order.status === filter);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
        <div className="nav-spinner" style={{ margin: '0 auto 10px' }} />
        Loading live food-service tasks...
      </div>
    );
  }

  const totalOrders = orders.length;
  const avgPrepTime = orders.length > 0
    ? Math.round(orders.reduce((sum, order) => sum + (order.estimatedTime || 0), 0) / orders.length)
    : 0;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.4) 0%, rgba(30,41,59,0.2) 100%)',
      borderRadius: 12,
      padding: 20,
      border: '1px solid rgba(148, 163, 184, 0.1)',
    }}>
      {newOrderAlert && (
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.1) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 8,
          color: '#60a5fa',
          marginBottom: 16,
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'slideInUp 0.3s ease',
        }}>
          <Bell size={18} />
          {newOrderAlert}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { icon: '⏳', label: 'Pending Intake', count: pendingOrders.length, color: '#06b6d4', filterKey: 'PENDING' },
          { icon: '🍳', label: 'In Preparation', count: preparingOrders.length, color: '#f59e0b', filterKey: 'PREPARING' },
          { icon: '✅', label: 'Ready to Collect', count: readyOrders.length, color: '#10b981', filterKey: 'READY' },
          { icon: '📦', label: 'Live Queue', count: totalOrders, color: '#60a5fa', filterKey: 'ALL' },
          { icon: '⏱', label: 'Avg Prep', count: `${avgPrepTime}m`, color: '#a78bfa', filterKey: null },
        ].map((stat) => (
          <div
            key={stat.label}
            onClick={() => stat.filterKey && setFilter(stat.filterKey)}
            style={{
              background: filter === stat.filterKey ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.02)',
              border: filter === stat.filterKey ? `1px solid ${stat.color}40` : '1px solid rgba(148,163,184,0.08)',
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
              cursor: stat.filterKey ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stat.color }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 8,
          color: '#10b981',
          marginBottom: 12,
          fontSize: '0.9rem',
          animation: 'slideInUp 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {(filter === 'ALL' || filter === 'PENDING') && pendingOrders.length > 0 && (
          <OrderSection
            title={`Incoming Orders (${pendingOrders.length})`}
            color="#06b6d4"
            icon={<Clock size={16} />}
            orders={pendingOrders}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            handleStatusUpdate={handleStatusUpdate}
            updating={updating}
          />
        )}

        {(filter === 'ALL' || filter === 'PREPARING') && preparingOrders.length > 0 && (
          <OrderSection
            title={`Preparation Queue (${preparingOrders.length})`}
            color="#f59e0b"
            icon={<ChefHat size={16} />}
            orders={preparingOrders}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            handleStatusUpdate={handleStatusUpdate}
            updating={updating}
          />
        )}

        {(filter === 'ALL' || filter === 'READY') && readyOrders.length > 0 && (
          <OrderSection
            title={`Ready for Collection (${readyOrders.length})`}
            color="#10b981"
            icon={<CheckCircle size={16} />}
            orders={readyOrders}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            handleStatusUpdate={handleStatusUpdate}
            updating={updating}
            canComplete
          />
        )}

        {filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🍽️</div>
            {filter === 'ALL' ? 'No active food-service tasks right now' : `No ${filter.toLowerCase()} orders`}
          </div>
        )}
      </div>
    </div>
  );
}
