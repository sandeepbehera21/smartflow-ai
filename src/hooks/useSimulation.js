import { useState, useEffect, useRef } from 'react';
import { subscribe, getSnapshot, tick } from '../engine/simulationEngine';

// Hook to subscribe to real-time simulation data
export function useSimulation(tickInterval = 2000) {
  const [data, setData] = useState(getSnapshot);
  const intervalRef = useRef(null);

  useEffect(() => {
    const unsub = subscribe(setData);
    intervalRef.current = setInterval(tick, tickInterval);
    return () => {
      unsub();
      clearInterval(intervalRef.current);
    };
  }, [tickInterval]);

  return data;
}
