import { useState, useEffect } from 'react';
import type { RoutePoint, PickingMode } from '../types';
import Map from '../components/Map';
import { geocodeApi, routeApi } from '../services/api';

export default function RoutesPage() {
  const [pickingMode, setPickingMode] = useState<PickingMode>('start');
  const [start, setStart] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [directions, setDirections] = useState<{ path: { lat:number, lon:number }[]; distance: number; duration:number } | null >(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function handleMapClick(lat: number, lon: number) {
    try {
      setError('');
      const result = await geocodeApi.reverse(lat, lon);
      const point: RoutePoint = {
        lat, 
        lon,
        label: result?.label ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`
      }

      if (pickingMode === 'start'){
        setStart(point);
      } else {
        setDestination(point);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve address');
    }
  }

  useEffect(() => {
    if (!start || !destination) return;
    const currentStart = start;
    const currentDestination = destination;

    async function fetchDirections() {
      try {
        setLoading(true);
        setError('');
        const result = await routeApi.directions(currentStart, currentDestination);
        setDirections(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to compute directions');
      } finally {
        setLoading(false);
      }
    }

    fetchDirections();
  }, [start, destination]);

  return (
    <div className="page">
      <h1>Routes</h1>
      <div className="mode-toggle">
        <button
          type="button"
          className={pickingMode === 'start' ? 'button primary' : 'button secondary'}
          onClick={() => setPickingMode('start')}>
            Set Start
        </button>

        <button
          type="button"
          className={pickingMode === 'destination' ? 'button primary' : 'button secondary'}
          onClick={() => setPickingMode('destination')}>
            Set Destination
        </button>
      </div>

      <div className="route-points">
        <p><strong>Start: {start ? `(${start.label})` : <span className="text-muted">Not set</span>}</strong></p>
        <p><strong>Destination: {destination ? `(${destination.label})` : <span className="text-muted">Not set</span>}</strong></p>
      </div>

      {error && <div className="page">{error}</div>}
      {loading && <div className="page">Loading...</div>}

      <div className="map-placeholder">
        <Map
          onMapClick={handleMapClick}
          route={{ start, destination, path: directions?.path ?? [] }}></Map>
      </div>

      <div className="page">
        <h1>Your Routes</h1>
        <p>Previously created and favourited routes (WIP)</p>
        {/* TODO: wire up routeApi.list() and favourites concept once the schema/endpoint supports it */}
      </div>
    </div>
  )
}
