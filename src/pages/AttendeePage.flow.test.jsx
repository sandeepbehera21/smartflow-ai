import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AttendeePage from './AttendeePage';

vi.mock('../components/Chatbot', () => ({ default: () => <div data-testid="chatbot" /> }));
vi.mock('../components/OrderModal', () => ({ default: () => <div data-testid="order-modal" /> }));
vi.mock('../components/OrderTracker', () => ({ default: () => <div data-testid="order-tracker" /> }));
vi.mock('../components/QueueManager', () => ({ default: () => <div data-testid="queue-manager" /> }));
vi.mock('../components/Recommendations', () => ({ default: () => <div data-testid="recommendations" /> }));
vi.mock('../components/StadiumMap', () => ({ default: () => <div data-testid="stadium-map" /> }));

vi.mock('../hooks/useFirestore', () => ({
  useFirestoreCrowdData: () => ({ crowdData: null }),
  useVenueUpdates: () => [],
  useActiveVenueSync: () => ({ activeVenue: null }),
}));

describe('AttendeePage setup flow', () => {
  const mockData = {
    zones: {},
    eventPhase: 'PRE_MATCH',
    alerts: [],
    stats: { avgDensity: 0.3 },
  };

  it('starts with stadium selection step', () => {
    render(<AttendeePage data={mockData} />);
    expect(screen.getByText(/choose your venue first/i)).toBeInTheDocument();
    expect(screen.queryByText('Selected Stadium')).not.toBeInTheDocument();
  });

  it('goes select stadium -> seat booking -> dashboard', () => {
    render(<AttendeePage data={mockData} />);

    fireEvent.click(screen.getAllByRole('button', { name: /select .*stadium/i })[0]);
    expect(screen.getByText('Book Your Seat')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Seat row'), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText('Seat number'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm seat and open dashboard/i }));

    expect(screen.getByText('Selected Stadium')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Live Stadium Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Queue Intelligence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI Picks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Orders' })).toBeInTheDocument();
  });
});
