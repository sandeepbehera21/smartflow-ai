/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, firebaseEnabled, firebaseMissingKeys } from '../config/firebase';

const AuthContext = createContext(null);

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'admin@smartflow.ai,sandeep@smartflow.ai')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
let anonymousAuthWarningShown = false;

function isAdminEmail(email) {
  return Boolean(email) && ADMIN_EMAILS.includes(email.toLowerCase());
}

function getLocalUserId() {
  let id = localStorage.getItem('smartflow_attendee_id');
  if (!id) {
    id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('smartflow_attendee_id', id);
  }
  return id;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setUser({ uid: getLocalUserId(), isAnonymous: true, email: null });
      setRole('attendee');
      setLoading(false);

      if (!anonymousAuthWarningShown && !firebaseEnabled) {
        anonymousAuthWarningShown = true;
        console.warn(
          `Firebase env missing in this deployment. Running in local demo mode without backend sync. Missing: ${firebaseMissingKeys.join(', ')}`
        );
      }
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setRole(firebaseUser.isAnonymous ? 'attendee' : isAdminEmail(firebaseUser.email) ? 'admin' : 'attendee');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!auth || loading || user) {
      return;
    }

    signInAnonymously(auth).catch((err) => {
      if (!anonymousAuthWarningShown) {
        anonymousAuthWarningShown = true;
        console.warn('Anonymous auth unavailable. Continuing with local attendee identity for demo mode.', err.message);
      }
      setUser({ uid: getLocalUserId(), isAnonymous: true, email: null });
      setRole('attendee');
    });
  }, [loading, user]);

  const loginAsAdmin = useCallback(async (email, password) => {
    setError(null);

    if (!auth) {
      const message = 'Firebase is not configured in this deployment. Add VITE_FIREBASE_* env vars in Vercel to enable admin login.';
      setError(message);
      throw new Error(message);
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!isAdminEmail(credential.user.email)) {
        await firebaseSignOut(auth);
        throw new Error('This account does not have admin privileges.');
      }

      return credential.user;
    } catch (err) {
      let message = err.message;

      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many login attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
      }

      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!auth) {
      setUser({ uid: getLocalUserId(), isAnonymous: true, email: null });
      setRole('attendee');
      return;
    }

    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    role,
    loading,
    error,
    isAdmin: role === 'admin',
    isAttendee: role === 'attendee',
    isAuthenticated: Boolean(user),
    isAnonymous: user?.isAnonymous ?? true,
    userId: user?.uid || getLocalUserId(),
    userEmail: user?.email || null,
    adminEmails: ADMIN_EMAILS,
    loginAsAdmin,
    logout,
    clearError: () => setError(null),
  }), [error, loading, loginAsAdmin, logout, role, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
