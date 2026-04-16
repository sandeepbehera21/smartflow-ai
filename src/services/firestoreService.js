import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, firebaseEnabled } from '../config/firebase';

let firestoreAvailable = null;

const PUBLIC_CROWD_DOC = ['publicData', 'currentCrowdState'];
const LOCAL_ORDERS_KEY = 'smartflow_orders';
const LOCAL_CROWD_KEY = 'smartflow_crowd';
const LOCAL_VENUE_UPDATES_KEY = 'smartflow_venue_updates';
const LOCAL_ACTIVE_VENUE_KEY = 'smartflow_active_venue';
const ACTIVE_ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY'];
const ORDER_STATUS_ALLOWED = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
const VENUE_SEVERITY_ALLOWED = ['info', 'warning', 'critical'];
const ACTIVE_VENUE_DOC = ['publicData', 'activeVenue'];
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'admin@smartflow.ai,sandeep@smartflow.ai')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const listeners = {
  orders: new Set(),
  crowdData: new Set(),
  venueUpdates: new Set(),
};
const warnedKeys = new Set();

function getCurrentUser() {
  return auth?.currentUser ?? null;
}

function warnOnce(key, message, detail) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message, detail);
}

function isCurrentUserAdmin() {
  const email = getCurrentUser()?.email?.toLowerCase();
  return Boolean(email) && ADMIN_EMAILS.includes(email);
}

function sanitizeText(value, maxLength = 220) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function normalizeOrderStatus(value) {
  const status = sanitizeText(value, 20).toUpperCase();
  if (!ORDER_STATUS_ALLOWED.includes(status)) {
    throw new Error(`Invalid order status: ${value}`);
  }
  return status;
}

function validateOrderPayload(orderData) {
  if (!orderData || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new Error('Order must include at least one item.');
  }

  const normalizedItems = orderData.items.slice(0, 30).map((item) => ({
    id: sanitizeText(item?.id, 40),
    name: sanitizeText(item?.name, 120),
    qty: Math.max(1, Math.min(99, Number(item?.qty || 1))),
    price: Math.max(0, Number(item?.price || 0)),
    emoji: sanitizeText(item?.emoji, 10),
  }));

  return {
    items: normalizedItems,
    foodCourt: sanitizeText(orderData.foodCourt, 80),
    totalPrice: Math.max(0, Number(orderData.totalPrice || 0)),
    estimatedTime: Math.max(0, Math.min(180, Number(orderData.estimatedTime || 0))),
    notes: sanitizeText(orderData.notes || '', 240),
  };
}

function validateVenuePayload(venueData) {
  const safeId = sanitizeText(venueData?.id, 60);
  const safeName = sanitizeText(venueData?.name, 140);
  if (!safeId || !safeName) {
    throw new Error('Venue payload must include id and name.');
  }

  return {
    ...venueData,
    id: safeId,
    name: safeName,
    city: sanitizeText(venueData?.city, 140),
  };
}

function generateAttendeeId() {
  let attendeeId = localStorage.getItem('smartflow_attendee_id');
  if (!attendeeId) {
    attendeeId = `attendee_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('smartflow_attendee_id', attendeeId);
  }
  return attendeeId;
}

function getCurrentAttendeeId() {
  const uid = getCurrentUser()?.uid;
  if (uid) {
    localStorage.setItem('smartflow_attendee_id', uid);
    return uid;
  }
  return generateAttendeeId();
}

function getLocalOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders) {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('Error saving orders to localStorage:', error);
  }
}

function emitOrdersChange() {
  const orders = getLocalOrders();
  listeners.orders.forEach((callback) => {
    try {
      callback(orders);
    } catch (error) {
      console.error(error);
    }
  });
}

function emitCrowdChange(data) {
  listeners.crowdData.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error(error);
    }
  });
}

function getLocalVenueUpdates() {
  try {
    const raw = localStorage.getItem(LOCAL_VENUE_UPDATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalVenueUpdates(updates) {
  try {
    localStorage.setItem(LOCAL_VENUE_UPDATES_KEY, JSON.stringify(updates));
  } catch (error) {
    console.error('Error saving venue updates to localStorage:', error);
  }
}

function emitVenueUpdatesChange() {
  const updates = getLocalVenueUpdates();
  listeners.venueUpdates.forEach((callback) => {
    try {
      callback(updates);
    } catch (error) {
      console.error(error);
    }
  });
}

function getLocalActiveVenue() {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVE_VENUE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalActiveVenue(venue) {
  try {
    localStorage.setItem(LOCAL_ACTIVE_VENUE_KEY, JSON.stringify(venue));
  } catch (error) {
    console.error('Error saving active venue to localStorage:', error);
  }
}

async function checkFirestoreConnection() {
  if (firestoreAvailable !== null) {
    return firestoreAvailable;
  }

  if (!firebaseEnabled || !db) {
    firestoreAvailable = false;
    return firestoreAvailable;
  }

  try {
    const testRef = doc(db, ...PUBLIC_CROWD_DOC);
    await getDoc(testRef);
    firestoreAvailable = true;
    if (import.meta.env.DEV) {
      console.log('Firestore connected successfully');
    }
  } catch (error) {
    firestoreAvailable = false;
    warnOnce('firestore-unavailable', 'Firestore unavailable, using local fallback.', error.message);
  }

  return firestoreAvailable;
}

checkFirestoreConnection();

export async function writeCrowdData(crowdSnapshot) {
  try {
    localStorage.setItem(LOCAL_CROWD_KEY, JSON.stringify(crowdSnapshot));
  } catch {
    // Ignore local storage failures.
  }

  if (!db || firestoreAvailable === false || !isCurrentUserAdmin()) {
    emitCrowdChange(crowdSnapshot);
    return;
  }

  try {
    const docRef = doc(db, ...PUBLIC_CROWD_DOC);
    await setDoc(docRef, {
      zones: crowdSnapshot.zones,
      eventPhase: crowdSnapshot.eventPhase,
      stats: crowdSnapshot.stats,
      alerts: crowdSnapshot.alerts,
      timestamp: serverTimestamp(),
    }, { merge: true });
  } catch {
    firestoreAvailable = false;
    emitCrowdChange(crowdSnapshot);
  }
}

export function listenToCrowdData(callback) {
  listeners.crowdData.add(callback);

  if (!db || firestoreAvailable === false) {
    try {
      const raw = localStorage.getItem(LOCAL_CROWD_KEY);
      if (raw) {
        callback(JSON.parse(raw));
      }
    } catch {
      // Ignore local parsing errors.
    }

    return () => {
      listeners.crowdData.delete(callback);
    };
  }

  try {
    const docRef = doc(db, ...PUBLIC_CROWD_DOC);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    }, (error) => {
      warnOnce('firestore-crowd-listener', 'Firestore crowd listener unavailable. Falling back to local crowd data.', error.message);
      firestoreAvailable = false;
    });

    return () => {
      unsubscribe();
      listeners.crowdData.delete(callback);
    };
  } catch {
    firestoreAvailable = false;
    return () => {
      listeners.crowdData.delete(callback);
    };
  }
}

export async function getCurrentCrowdState() {
  if (!db || firestoreAvailable === false) {
    try {
      const raw = localStorage.getItem(LOCAL_CROWD_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  try {
    const docRef = doc(db, ...PUBLIC_CROWD_DOC);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch {
    firestoreAvailable = false;
    return null;
  }
}

export async function createFoodOrder(orderData) {
  const safeOrderData = validateOrderPayload(orderData);
  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const attendeeId = orderData.attendeeId || getCurrentAttendeeId();

  const order = {
    orderId,
    attendeeId,
    items: safeOrderData.items,
    foodCourt: safeOrderData.foodCourt,
    totalPrice: safeOrderData.totalPrice,
    estimatedTime: safeOrderData.estimatedTime,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: safeOrderData.notes,
  };

  const localOrders = getLocalOrders();
  localOrders.push(order);
  saveLocalOrders(localOrders);
  emitOrdersChange();

  // Do not block attendee confirmation on remote Firestore health.
  if (db && firestoreAvailable !== false) {
    const orderRef = doc(collection(db, 'orders'), orderId);
    setDoc(orderRef, {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch((error) => {
      warnOnce('firestore-order-write', 'Firestore order sync failed. Order remains available locally.', error.message);
      firestoreAvailable = false;
    });
  }

  return order;
}

export async function updateOrderStatus(orderId, newStatus) {
  if (!isCurrentUserAdmin()) {
    throw new Error('Only admins can update order status.');
  }

  const normalizedStatus = normalizeOrderStatus(newStatus);
  const safeOrderId = sanitizeText(orderId, 80);
  if (!safeOrderId) {
    throw new Error('Order ID is required.');
  }

  const localOrders = getLocalOrders();
  const index = localOrders.findIndex((order) => order.orderId === safeOrderId || order.id === safeOrderId);
  if (index !== -1) {
    localOrders[index].status = normalizedStatus;
    localOrders[index].updatedAt = new Date().toISOString();
    saveLocalOrders(localOrders);
    emitOrdersChange();
  }

  if (db && firestoreAvailable !== false) {
    try {
      const orderRef = doc(db, 'orders', safeOrderId);
      await updateDoc(orderRef, {
        status: normalizedStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      warnOnce('firestore-order-update', 'Firestore order update failed. Local order state was updated instead.', error.message);
      firestoreAvailable = false;
    }
  }
}

export function listenToAttendeeOrders(attendeeId, callback) {
  const effectiveAttendeeId = attendeeId || getCurrentAttendeeId();

  const localCallback = (allOrders) => {
    callback(allOrders.filter((order) => order.attendeeId === effectiveAttendeeId));
  };
  listeners.orders.add(localCallback);

  const localOrders = getLocalOrders().filter((order) => order.attendeeId === effectiveAttendeeId);
  if (localOrders.length > 0) {
    callback(localOrders);
  }

  if (!db || firestoreAvailable === false) {
    return () => {
      listeners.orders.delete(localCallback);
    };
  }

  try {
    const q = query(collection(db, 'orders'), where('attendeeId', '==', effectiveAttendeeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach((docSnap) => {
        orders.push({ ...docSnap.data(), id: docSnap.id });
      });
      callback(orders);
    }, (error) => {
      warnOnce('firestore-attendee-orders', 'Firestore attendee order listener failed. Showing local order history.', error.message);
      firestoreAvailable = false;
    });

    return () => {
      unsubscribe();
      listeners.orders.delete(localCallback);
    };
  } catch {
    firestoreAvailable = false;
    return () => {
      listeners.orders.delete(localCallback);
    };
  }
}

export function listenToActiveOrders(callback) {
  if (!isCurrentUserAdmin()) {
    callback([]);
    return () => {};
  }

  const localCallback = (allOrders) => {
    callback(allOrders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)));
  };
  listeners.orders.add(localCallback);

  callback(getLocalOrders().filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)));

  if (!db || firestoreAvailable === false) {
    return () => {
      listeners.orders.delete(localCallback);
    };
  }

  try {
    const q = query(collection(db, 'orders'), where('status', 'in', ACTIVE_ORDER_STATUSES));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach((docSnap) => {
        orders.push({ ...docSnap.data(), id: docSnap.id });
      });
      callback(orders);
    }, (error) => {
      warnOnce('firestore-active-orders', 'Firestore active order listener failed. Showing local admin queue.', error.message);
      firestoreAvailable = false;
    });

    return () => {
      unsubscribe();
      listeners.orders.delete(localCallback);
    };
  } catch {
    firestoreAvailable = false;
    return () => {
      listeners.orders.delete(localCallback);
    };
  }
}

export async function getAllOrders(status = null) {
  if (!isCurrentUserAdmin()) {
    throw new Error('Only admins can view all orders.');
  }

  if (!db || firestoreAvailable === false) {
    const localOrders = getLocalOrders();
    return status ? localOrders.filter((order) => order.status === status) : localOrders;
  }

  try {
    const ordersRef = collection(db, 'orders');
    const q = status ? query(ordersRef, where('status', '==', status)) : ordersRef;
    const snapshot = await getDocs(q);
    const orders = [];

    snapshot.forEach((docSnap) => {
      orders.push({ ...docSnap.data(), id: docSnap.id });
    });

    return orders;
  } catch {
    firestoreAvailable = false;
    const localOrders = getLocalOrders();
    return status ? localOrders.filter((order) => order.status === status) : localOrders;
  }
}

export function getAttendeeId() {
  return getCurrentAttendeeId();
}

export async function batchUpdateOrders(updates) {
  if (!isCurrentUserAdmin()) {
    throw new Error('Only admins can batch update orders.');
  }

  const localOrders = getLocalOrders();
  updates.forEach(({ orderId, status }) => {
    const index = localOrders.findIndex((order) => order.orderId === orderId || order.id === orderId);
    if (index !== -1) {
      localOrders[index].status = status;
      localOrders[index].updatedAt = new Date().toISOString();
    }
  });
  saveLocalOrders(localOrders);
  emitOrdersChange();

  if (db && firestoreAvailable !== false) {
    try {
      const batch = writeBatch(db);
      updates.forEach(({ orderId, status }) => {
        batch.update(doc(db, 'orders', orderId), {
          status,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      warnOnce('firestore-batch-update', 'Firestore batch update failed. Local statuses still changed for the demo.', error.message);
      firestoreAvailable = false;
    }
  }
}

export async function cleanupCompletedOrders(hoursOld = 24) {
  if (!isCurrentUserAdmin()) {
    throw new Error('Only admins can clean up completed orders.');
  }

  const cutoffTime = Date.now() - hoursOld * 60 * 60 * 1000;
  const localOrders = getLocalOrders().filter((order) => {
    if (order.status !== 'COMPLETED') {
      return true;
    }
    return new Date(order.updatedAt).getTime() > cutoffTime;
  });
  saveLocalOrders(localOrders);
  emitOrdersChange();

  if (db && firestoreAvailable !== false) {
    try {
      const cutoffDate = new Date(cutoffTime);
      const q = query(
        collection(db, 'orders'),
        where('status', '==', 'COMPLETED'),
        where('updatedAt', '<', cutoffDate)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      warnOnce('firestore-cleanup', 'Firestore cleanup failed. Local cleanup still completed.', error.message);
      firestoreAvailable = false;
    }
  }
}

export function isFirestoreConnected() {
  return firestoreAvailable === true;
}

export async function saveAttendeeLocation(locationData) {
  const attendeeId = getCurrentAttendeeId();

  if (!db) {
    return { attendeeId, ...locationData };
  }

  const locationRef = doc(db, 'attendeeLocations', attendeeId);

  await setDoc(locationRef, {
    attendeeId,
    zoneId: locationData.zoneId,
    zoneName: locationData.zoneName || null,
    coordinates: locationData.coordinates || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return { attendeeId, ...locationData };
}

export async function clearAttendeeLocation(attendeeId = getCurrentAttendeeId()) {
  if (!db) {
    return;
  }

  await deleteDoc(doc(db, 'attendeeLocations', attendeeId));
}

export function createVenueUpdate(update) {
  if (!isCurrentUserAdmin()) {
    throw new Error('Only admins can create venue updates.');
  }

  const severity = sanitizeText(update?.severity || 'info', 20).toLowerCase();
  const safeSeverity = VENUE_SEVERITY_ALLOWED.includes(severity) ? severity : 'info';
  const nextUpdate = {
    id: sanitizeText(update?.id, 80) || `venue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: sanitizeText(update?.title, 140),
    message: sanitizeText(update?.message, 320),
    severity: safeSeverity,
    timestamp: new Date().toISOString(),
    source: sanitizeText(update?.source || 'ops', 40),
  };

  const updates = [nextUpdate, ...getLocalVenueUpdates()].slice(0, 12);
  saveLocalVenueUpdates(updates);
  emitVenueUpdatesChange();
  return nextUpdate;
}

export function listenToVenueUpdates(callback) {
  listeners.venueUpdates.add(callback);
  callback(getLocalVenueUpdates());

  const onStorage = (event) => {
    if (event.key === LOCAL_VENUE_UPDATES_KEY) {
      callback(getLocalVenueUpdates());
    }
  };

  window.addEventListener('storage', onStorage);

  return () => {
    listeners.venueUpdates.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
}

export async function setActiveVenue(venueData) {
  if (!isCurrentUserAdmin()) {
    throw new Error('Only admins can set active venue.');
  }

  const safeVenueData = validateVenuePayload(venueData);
  const payload = {
    ...safeVenueData,
    updatedAt: new Date().toISOString(),
    updatedBy: getCurrentUser()?.email || 'local-operator',
  };

  saveLocalActiveVenue(payload);

  if (db && firestoreAvailable !== false) {
    try {
      const venueRef = doc(db, ...ACTIVE_VENUE_DOC);
      await setDoc(venueRef, {
        ...payload,
        timestamp: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      warnOnce('firestore-active-venue-write', 'Active venue sync failed. Keeping local active venue.', error.message);
      firestoreAvailable = false;
    }
  }

  return payload;
}

export function listenToActiveVenue(callback) {
  const local = getLocalActiveVenue();
  if (local) {
    callback(local);
  }

  if (!db || firestoreAvailable === false) {
    const onStorage = (event) => {
      if (event.key === LOCAL_ACTIVE_VENUE_KEY) {
        const venue = getLocalActiveVenue();
        if (venue) callback(venue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }

  try {
    const venueRef = doc(db, ...ACTIVE_VENUE_DOC);
    const unsubscribe = onSnapshot(venueRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      saveLocalActiveVenue(data);
      callback(data);
    }, (error) => {
      warnOnce('firestore-active-venue-read', 'Active venue listener failed. Using local active venue.', error.message);
      firestoreAvailable = false;
    });

    return () => unsubscribe();
  } catch {
    firestoreAvailable = false;
    return () => {};
  }
}
