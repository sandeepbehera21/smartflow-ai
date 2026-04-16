import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QueueManager from './QueueManager';

describe('QueueManager', () => {
  it('renders correctly with given zones data', () => {
    const mockZones = {
      FOOD_A: { density: 0.8, waitTime: 12 },
      REST_N: { density: 0.2, waitTime: 2 },
    };

    render(<QueueManager zones={mockZones} />);

    // Fast check to see if the groups render
    expect(screen.getAllByText(/Food Courts/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Restrooms/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Entry \/ Exit Gates/i)[0]).toBeInTheDocument();
  });
});
