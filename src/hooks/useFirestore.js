/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { listenToCrowdData, listenToAttendeeOrders, listenToActiveOrders, listenToVenueUpdates } from '../services/firestoreService';

/**
 * Hook to listen to real-time crowd data from Firestore
 * Used by Admin Dashboard and info displays
 */
export function useFirestoreCrowdData() {
  const [crowdData, setCrowdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    try {
      const unsubscribe = listenToCrowdData((data) => {
        setCrowdData(data);
        setLoading(false);
      });

      // If no data comes within 3 seconds, stop loading anyway
      const timeout = setTimeout(() => setLoading(false), 3000);

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, []);

  return { crowdData, loading, error };
}

/**
 * Hook to listen to current user's food orders (real-time)
 * Used by Attendee page for order tracking.
 * Tracks status changes and fires optional callback for notifications.
 */
export function useMyOrders(attendeeId, onStatusChange) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevOrdersRef = useRef(new Map());

  useEffect(() => {
    if (!attendeeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const unsubscribe = listenToAttendeeOrders(attendeeId, (ordersData) => {
        // Detect status changes and fire notifications
        if (onStatusChange) {
          const prevMap = prevOrdersRef.current;
          ordersData.forEach((order) => {
            const prevStatus = prevMap.get(order.orderId);
            if (prevStatus && prevStatus !== order.status) {
              onStatusChange(order, prevStatus, order.status);
            }
          });
        }

        // Update the previous orders map
        const newMap = new Map();
        ordersData.forEach((order) => {
          newMap.set(order.orderId, order.status);
        });
        prevOrdersRef.current = newMap;

        setOrders(ordersData);
        setLoading(false);
      });

      // If no data comes within 3 seconds, stop loading
      const timeout = setTimeout(() => setLoading(false), 3000);

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [attendeeId, onStatusChange]);

  return { orders, loading, error };
}

/**
 * Hook to listen to all active orders (Admin Dashboard)
 * Used for order management and fulfillment
 */
export function useActiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    try {
      const unsubscribe = listenToActiveOrders((ordersData) => {
        // Detect new incoming orders for admin notification
        const pendingCount = ordersData.filter(o => o.status === 'PENDING').length;
        if (prevCountRef.current > 0 && pendingCount > prevCountRef.current) {
          const newCount = pendingCount - prevCountRef.current;
          setNewOrderAlert(`🔔 ${newCount} new order${newCount > 1 ? 's' : ''} incoming!`);
          // Play a notification sound (non-blocking)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZSPi4eBe3R0eH+Fio6QjoqFf3p2c3N1eX6DhomLioiFgHx4dXRzdHd7f4SHiYqJh4N/fHl3dnV2eHx/g4aIiomHhIB8eXd2dXV3en2BhIeJiYiGg398end2dXV3en2Ag4aIiYiGg398eXd2dXV3en2Ag4WIiIeGg398eXd2dXZ3en2Ag4WIiIeFgn57eHZ1dXZ4fH+ChYeIh4WCf3x5d3Z2d3l8f4KFh4iHhYJ/fHl3dnZ3eXx/goWHiIeFgn98eXd2dnZ4e3+ChIeHhoWCf3x5d3Z2d3l8f4KFh4eGhIJ/fHl3dnd3eXx/goSHh4aEgn98eXd2dnd5fH+ChIeHhoSCf3x5d3Z2d3l8f4KFh4eGhIF/fHl3dnd4eXt+goSGh4aEgn98eXd2dnd5fH+ChIeHhoSBf3x5d3Z2dnh8f4KFh4eGhIF/fHl3dnd3eXx/goSHh4eFgn98eXd2dnh5fH+ChIeHhoSCf3x5d3Z2d3l8f4KEh4eGhIJ/fHl3d3d4eXt+goSGh4aEgn98end3d3h5fH+ChIeHhoSCf3x5d3d3eHl8foKEh4aGhIJ/fHp3d3d4eXx+goSGhoaEgn98eXd3d3l5fH6ChIaHhoSCf3x5d3d3eHl8foKEhoaGhIJ/fHl3d3d4eXt+gYSGhoaEgn98eXd3d3h5fH6ChIaGhoSBf3x5d3d3eHl7foKEhoaGhIJ/fHl3d3d4eXx+goSGhoaEgX98eXd3d3h5fH6BhIaGhoSCf3x5d3d3eHl7foKEhoaGhIJ/fHl3d3d4eXx+goSGhoaEgn98end3d3h5fH6ChIaGhoSCf3x5d3d3eHl8foKEhoaGhIJ/fHp3d3d4eXx+goSGhoWEgX98eXd3d3h5fH6ChIaGhoSBf3x5d3d3eHl7foGEhoaGhIJ/fHl3d3d4eXx+goSGhoaEgn98eXd3d3h5fH6ChIaGhoSCf3x5d3d3eHl8foGEhoaGhIJ/fHl3d3d4eXx+goSGhoaEgX98eXd3d3h5fH6ChIaGhoSCf3x5d3d3eHl7foKEhoaGhIJ/fHl3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {
            // Ignore audio playback failures.
          }
          setTimeout(() => setNewOrderAlert(null), 4000);
        }
        prevCountRef.current = pendingCount;

        setOrders(ordersData);
        setLoading(false);
      });

      // If no data comes within 3 seconds, stop loading
      const timeout = setTimeout(() => setLoading(false), 3000);

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, []);

  return { orders, loading, error, newOrderAlert };
}

export function useVenueUpdates() {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const unsubscribe = listenToVenueUpdates(setUpdates);
    return unsubscribe;
  }, []);

  return updates;
}
