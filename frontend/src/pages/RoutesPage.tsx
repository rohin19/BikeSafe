import { useState, useEffect } from 'react';
import type { RoutePoint, PickingMode, User, Route } from '../types';
import Map from '../components/Map';
import { geocodeApi, routeApi } from '../services/api';

export default function RoutesPage({ user }: {user: User | null}) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RoutePoint[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [saved, setSaved] = useState(false);

  const [pickingMode, setPickingMode] = useState<PickingMode>('start');
  const [start, setStart] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [directions, setDirections] = useState<{ path: { lat:number, lon:number }[]; distance: number; duration:number; safetyScore:number } | null >(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [routes, setRoutes] = useState<Route[]>([]);
  // sets whiever point (start/dest) is currently active based on pickingMode
  function selectPoint(point: RoutePoint) {
    if (pickingMode === 'start') {
      setStart(point);
    } else {
      setDestination(point);
    }
  }

  // reverse geocodes a map click into a labeled point, then --> selectPoint
  async function handleMapClick(lat: number, lon: number) {
    try {
      setError('');
      const result = await geocodeApi.reverse(lat, lon);
      const point: RoutePoint = {
        lat, 
        lon,
        label: result?.label ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`
      }

      selectPoint(point);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve address');
    }
  }

  // saves route on display
  async function handleSave() {
    if (!start || !destination || !directions || !user) return;

    try {
      setError('');
      await routeApi.create({
        start_name: start.label,
        start_latitude: start.lat,
        start_longitude: start.lon,
        destination_name: destination.label,
        destination_latitude: destination.lat,
        destination_longitude: destination.lon,
        elevation: 0, // hardcoded for now, to be implemented
        distance: directions.distance,
        duration: directions.duration,
        safety_score: directions.safetyScore,
        created_by: user.user_id,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save route');
    }
  }

  // fetches the ORS road route once both start and dest are set
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

  // debounced forward-geocode search as user types
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await geocodeApi.search(query);
        setSearchResults(results);
      } catch (e) {
        setError(e instanceof Error ? e.message: 'Failed to search');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // loads saved routes for the "your Routes" section; refetches after a successful save so new one appears
  useEffect(() => {
    routeApi.list()
      .then(setRoutes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load routes'))
  }, [saved]);
  
  return (
    <div className="page">
      <h1>Routes</h1>
      <div className="route-search">
        <input 
          type="text"
          placeholder={`Search for ${pickingMode} address... `}
          value={query}
          onChange={(e) => setQuery(e.target.value)}/>
        {searching && <p className="text-muted">Searching... </p>}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result) => (
              <button
                key={`${result.lat}, ${result.lon}`}
                type="button"
                className="search-result-item"
                onClick={() => {selectPoint(result); setQuery(''); setSearchResults([]); }}>
                  {result.label}
                </button>
            ))}
          </div>
        )}
      </div>

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
        <p><strong>Start: {start ? `${start.label}` : <span className="text-muted">Not set</span>}</strong></p>
        <p><strong>Destination: {destination ? `${destination.label}` : <span className="text-muted">Not set</span>}</strong></p>
      </div>
      {directions && (
        <>
          <p>Distance: {(directions.distance / 1000).toFixed(2)} km · Duration: {Math.round(directions.duration / 60)} min. · Safety Score: {directions.safetyScore}/100</p>
          <button
            type="button"
            className="button primary"
            onClick={handleSave}
            disabled={!user || saved}
          >{saved ? 'Saved!' : 'Save Route'}</button>
        </>
      )}

      {error && <div className="page">{error}</div>}
      {loading && <div className="page">Loading...</div>}

      <div className="map-placeholder">
        <Map
          onMapClick={handleMapClick}
          route={{ start, destination, path: directions?.path ?? [] }}></Map>
      </div>

      <div className="page">
        <h1>Your Routes</h1>
        {routes.length === 0 && <p className="text-muted"> No routes saved yet.</p>}
        {routes.map((r) => (
          <div key={r.route_id} className="route-card">
            <p><strong>{r.start_name} → {r.destination_name}</strong></p>
            <p className="text-muted">
              {(r.distance / 1000).toFixed(2)} km · {Math.round(r.duration / 60)} min · Safety {r.safety_score}/100
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
