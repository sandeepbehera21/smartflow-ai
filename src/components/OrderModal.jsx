import { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, CheckCircle, Clock } from 'lucide-react';
import { createFoodOrder } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

const MENU = {
  'Food Court Alpha': [
    { id: 'fa1', name: 'Classic Burger & Fries', price: 12.99, emoji: '🍔', prepTime: '8 min', tag: 'Popular' },
    { id: 'fa2', name: 'Pepperoni Pizza Slice', price: 7.50,  emoji: '🍕', prepTime: '5 min', tag: 'Fast' },
    { id: 'fa3', name: 'Nachos Supreme',        price: 9.99,  emoji: '🌮', prepTime: '6 min', tag: null },
    { id: 'fa4', name: 'Hot Dog Combo',          price: 8.50,  emoji: '🌭', prepTime: '4 min', tag: 'Best Seller' },
    { id: 'fa5', name: 'Loaded Fries',           price: 6.00,  emoji: '🍟', prepTime: '5 min', tag: null },
  ],
  'Food Court Beta': [
    { id: 'fb1', name: 'Chicken Tenders Basket', price: 13.50, emoji: '🍗', prepTime: '9 min', tag: 'Popular' },
    { id: 'fb2', name: 'BBQ Pulled Pork Wrap',   price: 11.00, emoji: '🌯', prepTime: '7 min', tag: null },
    { id: 'fb3', name: 'Veggie Burger',           price: 10.99, emoji: '🥗', prepTime: '6 min', tag: 'Healthy' },
    { id: 'fb4', name: 'Soft Pretzel & Cheese',  price: 6.50,  emoji: '🥨', prepTime: '3 min', tag: 'Fast' },
    { id: 'fb5', name: 'Stadium Nachos',          price: 8.99,  emoji: '🌮', prepTime: '5 min', tag: null },
  ],
  'Food Court Gamma': [
    { id: 'fc1', name: 'Fish & Chips',           price: 14.00, emoji: '🐟', prepTime: '10 min', tag: null },
    { id: 'fc2', name: 'Beef Tacos (3)',          price: 11.50, emoji: '🌮', prepTime: '7 min', tag: 'Popular' },
    { id: 'fc3', name: 'Cheese Quesadilla',       price: 9.00,  emoji: '🧀', prepTime: '6 min', tag: null },
    { id: 'fc4', name: 'Spicy Wings (6pc)',       price: 13.00, emoji: '🍗', prepTime: '9 min', tag: 'Hot 🌶️' },
    { id: 'fc5', name: 'Garden Salad Box',        price: 8.50,  emoji: '🥗', prepTime: '4 min', tag: 'Healthy' },
  ],
};

const DRINKS = [
  { id: 'd1', name: 'Cola (Large)',    price: 4.50, emoji: '🥤', prepTime: '1 min' },
  { id: 'd2', name: 'Beer Pint',       price: 7.00, emoji: '🍺', prepTime: '2 min' },
  { id: 'd3', name: 'Water (500ml)',   price: 2.50, emoji: '💧', prepTime: '1 min' },
  { id: 'd4', name: 'Hot Coffee',      price: 4.00, emoji: '☕', prepTime: '3 min' },
];

const ALL_COURTS = Object.keys(MENU);

export default function OrderModal({ onClose, preferredCourt, onOrderPlaced }) {
  const { userId } = useAuth();
  const [selectedCourt, setSelectedCourt] = useState(preferredCourt || ALL_COURTS[0]);
  const [cart, setCart] = useState({});
  const [ordered, setOrdered] = useState(false);
  const [orderNum, setOrderNum] = useState('');
  const [activeTab, setActiveTab] = useState('food');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const menuItems = activeTab === 'food' ? MENU[selectedCourt] : DRINKS;

  const updateCart = (itemId, delta) => {
    setCart(prev => {
      const curr = prev[itemId] || 0;
      const next = Math.max(0, curr + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const allItems = [...(MENU[selectedCourt] || []), ...DRINKS];
  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const item = allItems.find(i => i.id === id);
      return item ? { ...item, qty } : null;
    })
    .filter(Boolean);

  const total = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const maxPrepTime = cartItems.reduce((max, i) => {
    const mins = parseInt(i.prepTime);
    return mins > max ? mins : max;
  }, 0);

  const placeOrder = async () => {
    if (totalItems === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create order in Firestore
      const order = await createFoodOrder({
        attendeeId: userId,
        items: cartItems,
        foodCourt: selectedCourt,
        totalPrice: total,
        estimatedTime: maxPrepTime,
      });
      
      setOrderNum(order.orderId.slice(-6));
      setOrdered(true);
      if (onOrderPlaced) onOrderPlaced(order);
    } catch (err) {
      console.error('Error placing order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel order-modal-panel" role="dialog" aria-modal="true" aria-label="Order Ahead">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-icon">🍔</div>
            <div>
              <div className="modal-title">Order Ahead</div>
              <div className="modal-subtitle">Skip the queue — pick up when ready</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        {ordered ? (
          /* ── ORDER CONFIRMED SCREEN ── */
          <div className="order-confirmed">
            <div className="order-confirmed-icon">✅</div>
            <div className="order-confirmed-title">Order Placed!</div>
            <div className="order-confirmed-number">#{orderNum}</div>
            <div className="order-confirmed-detail">
              Your order from <strong>{selectedCourt}</strong> will be ready in approximately
              <strong> ~{maxPrepTime} minutes</strong>.
            </div>
            <div className="order-confirmed-steps">
              <div className="confirmed-step active"><CheckCircle size={16} /> Order received</div>
              <div className="confirmed-step"><Clock size={16} /> Preparing your food</div>
              <div className="confirmed-step">📍 Ready for pickup</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
              Show order #{orderNum} at the pickup counter — skip the line!
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 20, width: '100%' }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Food Court Selector */}
            <div className="order-court-tabs">
              {ALL_COURTS.map(court => (
                <button
                  key={court}
                  className={`order-court-tab ${selectedCourt === court ? 'active' : ''}`}
                  onClick={() => { setSelectedCourt(court); setActiveTab('food'); }}
                >
                  {court.replace('Food Court ', '')}
                </button>
              ))}
            </div>

            {/* Food / Drinks Tab */}
            <div className="order-category-tabs">
              <button className={`order-cat-tab ${activeTab === 'food' ? 'active' : ''}`} onClick={() => setActiveTab('food')}>🍔 Food</button>
              <button className={`order-cat-tab ${activeTab === 'drinks' ? 'active' : ''}`} onClick={() => setActiveTab('drinks')}>🥤 Drinks</button>
            </div>

            {/* Menu Items */}
            <div className="order-menu-list">
              {menuItems.map(item => (
                <div key={item.id} className="menu-item">
                  <div className="menu-item-emoji">{item.emoji}</div>
                  <div className="menu-item-info">
                    <div className="menu-item-name">
                      {item.name}
                      {item.tag && <span className="menu-tag">{item.tag}</span>}
                    </div>
                    <div className="menu-item-meta">
                      <span className="menu-price">${item.price.toFixed(2)}</span>
                      <span className="menu-prep"><Clock size={11} /> {item.prepTime}</span>
                    </div>
                  </div>
                  <div className="menu-item-controls">
                    <button className="qty-btn" onClick={() => updateCart(item.id, -1)} disabled={!cart[item.id]}>
                      <Minus size={12} />
                    </button>
                    <span className="qty-num">{cart[item.id] || 0}</span>
                    <button className="qty-btn add" onClick={() => updateCart(item.id, 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary & Checkout */}
            <div className="order-cart-bar">
              {error && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  marginBottom: 12,
                }}>
                  ⚠️ {error}
                </div>
              )}
              <div className="cart-summary">
                <ShoppingCart size={16} />
                <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>·</span>
                <span className="cart-total">${total.toFixed(2)}</span>
                {maxPrepTime > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                    · ~{maxPrepTime} min
                  </span>
                )}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={placeOrder}
                disabled={totalItems === 0 || isSubmitting}
                style={{ flexShrink: 0 }}
              >
                {isSubmitting ? '⏳ Placing...' : 'Place Order →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
