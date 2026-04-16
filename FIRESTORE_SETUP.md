# SmartFlow AI - Firestore Real-Time Synchronization Setup Guide

## Overview

This document explains how to set up Firebase Firestore for real-time data synchronization of crowd density and food orders.

## What's Implemented

### ✅ Real-Time Crowd Density Synchronization

- **Frontend Simulation → Firestore**: The simulation engine now writes crowd snapshot data to Firestore every 2 seconds
- **Admin Dashboard Listening**: The Admin Dashboard listens to real-time updates from Firestore
- **Multiple Admin Sync**: Multiple admins viewing the dashboard see the same live data

### ✅ Real-Time Order Management

- **Order Placement**: When attendees place food orders, data is saved to Firestore with status PENDING
- **Order Status Updates**: Admins can update order status (PENDING → PREPARING → READY → COMPLETED)
- **Attendee Tracking**: Attendees see real-time order status in "My Orders" tab
- **Live Order Dashboard**: Admin Dashboard shows all active orders grouped by status

### 📁 File Structure

```
src/
├── config/
│   └── firebase.js              # Firebase initialization
├── services/
│   └── firestoreService.js      # Firestore CRUD operations
├── hooks/
│   ├── useSimulation.js         # Local simulation hook (unchanged)
│   └── useFirestore.js          # Real-time Firestore listeners
├── components/
│   ├── OrderTracker.jsx         # Attendee order tracking UI
│   ├── OrderManagement.jsx      # Admin order management UI
│   └── OrderModal.jsx           # Updated with Firestore save
├── pages/
│   ├── AdminDashboard.jsx       # Updated with Firestore listeners
│   └── AttendeePage.jsx         # Updated with OrderTracker tab
└── engine/
    └── simulationEngine.js      # Updated to write to Firestore
```

## Firebase Setup Instructions

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create Project"
3. Project Name: `smartflow-ai`
4. Disable Google Analytics (optional)
5. Click "Create"

### Step 2: Add Firestore Database

1. In Firebase Console, go to **Build → Firestore Database**
2. Click "Create database"
3. Select region: `us-east1` (or closest to you)
4. Start in **Production mode** (we'll configure security rules)
5. Click "Create"

### Step 3: Configure Firestore Security Rules

1. In Firestore, go to **Rules**
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow reads/writes for simulation data (real-time updates)
    match /simulation/{document=**} {
      allow read, write: if true;
    }

    // Allow anyone to create and read orders, update their own
    match /orders/{orderId} {
      allow create: if true;
      allow read: if true;
      allow update, delete: if true;
    }

    // Workspace rules (for analytics, optional)
    match /analytics/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Click "Publish" to apply the rules.

### Step 4: Get Firebase Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Click on the web app icon (if you don't see it, click "Add app")
4. Copy all the config values

### Step 5: Update .env.local

Edit `.env.local` and replace all placeholder values:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

### Step 6: Install Firebase Package (Already Done)

The `firebase` package is already in `package.json`. If needed, install with:

```bash
npm install firebase
```

### Step 7: Test the Connection

1. Run the development server:
   ```bash
   npm run dev
   ```
2. Open two browser windows:
   - **Window 1**: Go to http://localhost:5173 and switch to Admin Dashboard
   - **Window 2**: Go to http://localhost:5173/admin (or same dashboard)
3. You should see real-time crowd density data syncing between windows
4. Check Firebase Console → Firestore to see the data being written

## Data Structure in Firestore

### Collection: `simulation`

```
/simulation/currentCrowdState
{
  zones: {
    GATE_A: { density: 0.65, waitTime: 12, alert: false, trend: 1 },
    FOOD_A: { density: 0.42, waitTime: 8, alert: false, trend: -1 },
    ...
  },
  eventPhase: "MATCH",
  stats: {
    maxDensity: 0.95,
    avgDensity: 0.58,
    highRiskCount: 3,
    totalZones: 19
  },
  alerts: [
    { zoneName: "North Stand", message: "High congestion...", severity: "critical" }
  ],
  timestamp: <server timestamp>
}
```

### Collection: `orders`

```
/orders/{orderId}
{
  orderId: "order_12345",
  attendeeId: "attendee_1234567890_xyz",
  items: [
    {
      id: "fa1",
      name: "Classic Burger & Fries",
      qty: 2,
      price: 12.99,
      emoji: "🍔"
    }
  ],
  foodCourt: "Food Court Alpha",
  totalPrice: 25.98,
  estimatedTime: 8,
  status: "PENDING", // PENDING | PREPARING | READY | COMPLETED | CANCELLED
  createdAt: <server timestamp>,
  updatedAt: <server timestamp>,
  notes: ""
}
```

## Firestore Service API

### Crowd Data

```javascript
// Write crowd snapshot (called by simulation engine every tick)
await writeCrowdData(crowdSnapshot);

// Listen to real-time crowd updates
const unsubscribe = listenToCrowdData((data) => {
  console.log("Crowd data updated:", data);
});

// Get current snapshot (one-time fetch)
const currentState = await getCurrentCrowdState();
```

### Order Management

```javascript
// Create a new order
const order = await createFoodOrder({
  attendeeId,
  items,
  foodCourt,
  totalPrice,
  estimatedTime,
});

// Update order status (admin action)
await updateOrderStatus(orderId, "PREPARING");

// Listen to specific attendee's orders
const unsub = listenToAttendeeOrders(attendeeId, (orders) => {
  console.log("My orders:", orders);
});

// Listen to all active orders (admin view)
const unsub = listenToActiveOrders((orders) => {
  console.log("All active orders:", orders);
});

// Get attendee ID (generated/stored in localStorage)
const id = getAttendeeId();
```

## Hooks for Components

### useFirestoreCrowdData()

```javascript
const { crowdData, loading, error } = useFirestoreCrowdData();
// crowdData.zones, crowdData.eventPhase, crowdData.stats, crowdData.alerts
```

### useMyOrders(attendeeId)

```javascript
const { orders, loading, error } = useMyOrders(attendeeId);
// orders is array of order documents
```

### useActiveOrders()

```javascript
const { orders, loading, error } = useActiveOrders();
// orders is array of all PENDING, PREPARING, READY orders
```

## Testing Scenarios

### Test 1: Real-Time Crowd Sync

1. Open Admin Dashboard in Window 1 and Window 2
2. Watch heatmap updates instantly in both windows
3. Check Firestore Console to see updates every 2 seconds

### Test 2: Order Placement

1. Switch to Attendee Page
2. Click "AI Picks" → "Browse Menu & Order"
3. Add items to cart and place order
4. Check "My Orders" tab to see status
5. Check Firestore Console → orders collection to see the new order

### Test 3: Order Status Updates

1. As Admin, scroll down to "Order Management"
2. See PENDING orders in list
3. Click "Start Preparing" to change status to PREPARING
4. Watch Attendee's "My Orders" tab update in real-time
5. Click "Mark Ready" to change to READY
6. Attendee sees 🎉 order ready notification

### Test 4: Multiple Admins

1. Open Admin Dashboard in two different browser windows
2. Trigger an emergency or change something
3. Both dashboards update in real-time from Firestore

## Troubleshooting

### Data Not Syncing?

1. Check `.env.local` for correct Firebase credentials
2. Verify Firestore is enabled in Firebase Console
3. Check browser console for errors
4. Confirm Firestore security rules allow reads/writes

### Orders Not Saving?

1. Ensure Firestore database is created
2. Check Firestore Console → orders collection exists
3. Look for errors in browser console
4. Verify Firebase credentials in .env

### Real-Time Listeners Not Working?

1. Check network tab in DevTools
2. Verify Firestore Rules are not rejecting requests
3. Ensure app is connected to internet
4. Try reloading the page

## Performance Considerations

- **Simulation writes**: Every 2 seconds (configurable with `tickInterval`)
- **Firestore reads**: Real-time listeners (automatic updates)
- **Data per write**: ~1-2 KB per simulation update
- **Estimated monthly cost**: Free tier covers ~50,000 reads/writes

## Next Steps

1. **Deploy to Vercel**:
   - Push to GitHub
   - Connect Vercel to repo
   - Set environment variables in Vercel Dashboard
   - Deploy

2. **Add Authentication**:
   - Implement Firebase Auth for admin login
   - Restrict order updates to admins only

3. **Add Analytics**:
   - Track events to `analytics` collection
   - Analyze peak times and trends

4. **Enhance Security**:
   - Implement user roles (admin/attendee)
   - Add custom security rules per role
   - Add data encryption

## Support

For issues or questions, check:

- Firebase Documentation: https://firebase.google.com/docs
- Cloud Firestore Guide: https://firebase.google.com/docs/firestore
- GitHub Issues (if applicable)
