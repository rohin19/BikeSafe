import { useState } from 'react';
import type { RoutePoint, PickingMode } from '../types';

export default function RoutesPage() {
  const [pickingMode, setPickingMode] = useState<PickingMode>('start');
  const [start, setStart] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  return (
    <div className="page">
      <h1>Routes</h1>
      <div className="mode-toggle">
        <button
          type="button"
          className={pickingMode === 'start' ? 'button primary' : 'button secondary'}
          onClick={() => setPickingMode('start')}>
            Set Start {start ? `(${start.label})` : ''}
        </button>

        <button
          type="button"
          className={pickingMode === 'destination' ? 'button primary' : 'button secondary'}
          onClick={() => setPickingMode('destination')}>
            Set Destination {destination ? `(${destination.label})` : ''}
        </button>
      </div>

      {error && <div className="page">{error}</div>}
      {loading && <div className="page">Loading...</div>}
    </div>
  )
}
