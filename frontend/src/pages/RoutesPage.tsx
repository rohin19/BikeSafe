import { useState, useEffect } from 'react';
import type { RoutePoint, PickingMode, User, Route, Hazard } from '../types';
import Map from '../components/Map';
import { geocodeApi, routeApi, hazardApi } from '../services/api';

export default function RoutesPage({ user }: {user: User | null}) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RoutePoint[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [saved, setSaved] = useState(false);

  const [pickingMode, setPickingMode] = useState<PickingMode>('start');
  const [start, setStart] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [alternatives, setAlternatives] = useState<{ path: { lat:number, lon:number }[]; distance: number; duration:number; safetyScore:number; elevation: number; avoidedHazards: boolean }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // derived, not its own state - everywhere below that reads directions.X just keeps working
  const directions = selectedIndex !== null ? alternatives[selectedIndex] : null;
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [routes, setRoutes] = useState<Route[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]); // list for admin purposes
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number } | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [navigating, setNavigating] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lon: number } | null>(null);

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

  // delete handler
  async function handleDelete(routeId: number) {
    try {
      setError('');
      await routeApi.remove(routeId);
      setRoutes((prev) => prev.filter((r) => r.route_id !== routeId));
      setAllRoutes((prev) => prev.filter((r) => r.route_id !== routeId)); // keep lists in sync (one is for admins)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete route');
    }
  }

  // selects a saved route to view: reuses the same start/dest -> directions pipeline as planning a new one, just seeded from a saved row instead of a search/click
  function handleSelectRoute(r: Route) {
    setStart({ lat: r.start_latitude, lon: r.start_longitude, label: r.start_name });
    setDestination({ lat: r.destination_latitude, lon: r.destination_longitude, label: r.destination_name });
    setFlyTo({ lat: r.start_latitude, lon: r.start_longitude });
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
        elevation: directions.elevation, 
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
        setAlternatives(result.alternatives);

        // default to whichever alternative scored safest, user can still pick a different one below
        const safestIndex = result.alternatives.reduce(
          (bestI: number, alt: typeof result.alternatives[number], i: number) =>
            alt.safetyScore > result.alternatives[bestI].safetyScore ? i : bestI,
          0
        );
        setSelectedIndex(result.alternatives.length > 0 ? safestIndex : null);
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
    routeApi.mine()
      .then(setRoutes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load routes'))
  }, [saved]);

  // admin-only: loads every route in the system, not just the logged-in user's saved routes
  useEffect(() => {
    if (user?.role !== 'admin') {
      setAllRoutes([]);
      return;
    }

    routeApi.list()
      .then(setAllRoutes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load all routes'));
  }, [saved, user]);

  // loads hazards once so they show up on the map while planning a route
  useEffect(() => {
    hazardApi.list()
      .then(setHazards)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load hazards'));
  }, []);

  // live navigation: only watches position while navigating is on, so we don't prompt for location before the user asks
  useEffect(() => {
    if (!navigating) {
      setLiveLocation(null);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLiveLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      () => setError('Unable to track your location'),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [navigating]);

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
                onClick={() => {selectPoint(result); setFlyTo({ lat: result.lat, lon: result.lon }); setQuery(''); setSearchResults([]); }}>
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
      {alternatives.length > 1 && (
        // route picker - clicking a card just swaps selectedIndex, which drives the derived `directions` above
        <div className="route-search">
          {alternatives.map((alt, i) => (
            <button
              key={i}
              type="button"
              className={i === selectedIndex ? 'route-card selected' : 'route-card'}
              onClick={() => setSelectedIndex(i)}
            >
              <p><strong>Route {i + 1}{alt.avoidedHazards ? ' — Avoids nearby hazards' : ''}</strong></p>
              <p className="text-muted">
                {(alt.distance / 1000).toFixed(2)} km · {Math.round(alt.duration / 60)} min · {Math.round(alt.elevation)} m elevation · Safety {alt.safetyScore}/100
              </p>
            </button>
          ))}
        </div>
      )}

      {directions && (
        <>
          <p>Distance: {(directions.distance / 1000).toFixed(2)} km · Duration: {Math.round(directions.duration / 60)} min. · Elevation Gain: {Math.round(directions.elevation)} m · Safety Score: {directions.safetyScore}/100.00</p>
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
          route={{ start, destination, path: directions?.path ?? [] }}
          flyTo={flyTo}
          hazards={hazards}></Map>
      </div>

      <div className="page">
        <h1>Your Routes</h1>
        {routes.length === 0 && <p className="text-muted"> No routes saved yet.</p>}
        {routes.map((r) => (
          <div key={r.route_id} className="route-card" onClick={() => handleSelectRoute(r)}>
            <p><strong>{r.start_name} → {r.destination_name}</strong></p>
            <p className="text-muted">
              {(r.distance / 1000).toFixed(2)} km · {Math.round(r.duration / 60)} min · Elevation Gain: {Math.round(r.elevation)} m elevation· Safety {r.safety_score}/100.00
            </p>
            <button type="button" className="button danger" onClick={(e) => { e.stopPropagation(); handleDelete(r.route_id!); }}>X</button>
          </div>
        ))}
      </div>

      {user?.role === 'admin' && (
        <div className="page">
          <h1>All Routes (Admin)</h1>
          {allRoutes.length === 0 && <p className="text-muted">No routes exist yet.</p>}
          {allRoutes.map((r) => (
            <div key={r.route_id} className="route-card" onClick={() => handleSelectRoute(r)}>
              <p><strong>{r.start_name} → {r.destination_name}</strong></p>
              <p className="text-muted">
                {(r.distance / 1000).toFixed(2)} km · {Math.round(r.duration / 60)} min · {Math.round(r.elevation)} m elevation · Safety {r.safety_score}/100 · Created by user #{r.created_by}
              </p>
              <button type="button" className="button danger" onClick={(e) => { e.stopPropagation(); handleDelete(r.route_id!); }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
