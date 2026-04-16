import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/firebase', () => ({
  auth: { currentUser: null },
  db: null,
  firebaseEnabled: false,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

describe('firestoreService security hardening', async () => {
  const mod = await import('./firestoreService');

  it('blocks non-admin from setting active venue', async () => {
    await expect(mod.setActiveVenue({ id: 'venue1', name: 'Venue 1' })).rejects.toThrow(
      /Only admins can set active venue/i
    );
  });

  it('blocks non-admin from creating venue updates', () => {
    expect(() => mod.createVenueUpdate({ title: 'test', message: 'test' })).toThrow(
      /Only admins can create venue updates/i
    );
  });

  it('rejects invalid order status', async () => {
    await expect(mod.updateOrderStatus('order_1', 'hack')).rejects.toThrow(
      /Only admins can update order status|Invalid order status/i
    );
  });
});
