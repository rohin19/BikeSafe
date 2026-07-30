import { useState, useEffect } from 'react';
import type { RoutePoint, PickingMode, User, Route, Hazard } from '../types';
import Map from '../components/Map';
import { geocodeApi, routeApi, hazardApi } from '../services/api';
import '../styles/RoutesPage.css'

export interface RouteAlternative {
  path: { lat: number; lon: number }[];
  distance: number;
  duration: number;
  safetyScore: number;
  elevation: number;
  avoidedHazards: boolean;
}

// picks the index of whichever alternative scored safest; null when there's nothing to pick from.
// pulled out as a standalone function so this logic is unit-testable without rendering the page
export function pickSafestIndex(alternatives: RouteAlternative[]): number | null {
  if (alternatives.length === 0) return null;
  return alternatives.reduce(
    (bestI, alt, i) => (alt.safetyScore > alternatives[bestI]!.safetyScore ? i : bestI),
    0
  );
}

export default function RoutesPage({ user }: {user: User | null}) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RoutePoint[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [saved, setSaved] = useState(false);

  const [pickingMode, setPickingMode] = useState<PickingMode>('start');
  const [start, setStart] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [alternatives, setAlternatives] = useState<RouteAlternative[]>([]);
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
        setSelectedIndex(pickSafestIndex(result.alternatives));
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
  // no external api needed, this geolocation interface is part of the browser: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
  // NOTe: requires HTTPS (or localhost) + user permission to activate this feature, won't work on plain HTTP prod deployment
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
    <div className="routes-page">
      <header className="routes-header">
        <h1>Routes</h1>
      </header>

      <div className="routes-layout">
        <section className="route-planner">
          <div className="route-search">
            <input
              type="text"
              placeholder={`Search for ${pickingMode} address...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {searching && (
              <p className="route-message">Searching...</p>
            )}

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <button
                    key={`${result.lat},${result.lon}`}
                    type="button"
                    className="search-result-item"
                    onClick={() => {
                      selectPoint(result)
                      setFlyTo({
                        lat: result.lat,
                        lon: result.lon,
                      })
                      setQuery('')
                      setSearchResults([])
                    }}
                  >
                    {result.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mode-toggle">
            <button
              type="button"
              className={
                pickingMode === 'start'
                  ? 'button primary'
                  : 'button secondary'
              }
              onClick={() => setPickingMode('start')}
            >
              Set start
            </button>

            <button
              type="button"
              className={
                pickingMode === 'destination'
                  ? 'button primary'
                  : 'button secondary'
              }
              onClick={() => setPickingMode('destination')}
            >
              Set destination
            </button>
          </div>

          <div className="route-points">
            <p>
              <span>Start</span>
              <strong>{start?.label ?? 'Not set'}</strong>
            </p>

            <p>
              <span>Destination</span>
              <strong>{destination?.label ?? 'Not set'}</strong>
            </p>
          </div>

          {alternatives.length > 1 && (
            <div className="route-alternatives">
              {alternatives.map((alternative, index) => (
                <button
                  key={index}
                  type="button"
                  className={
                    index === selectedIndex
                      ? 'route-card selected'
                      : 'route-card'
                  }
                  onClick={() => setSelectedIndex(index)}
                >
                  <strong>
                    Route {index + 1}
                    {alternative.avoidedHazards
                      ? ' — Avoids nearby hazards'
                      : ''}
                  </strong>

                  <span>
                    {(alternative.distance / 1000).toFixed(2)} km ·{' '}
                    {Math.round(alternative.duration / 60)} min ·{' '}
                    {Math.round(alternative.elevation)} m elevation ·{' '}
                    Safety {alternative.safetyScore}/100
                  </span>
                </button>
              ))}
            </div>
          )}

          {directions && (
            <div className="route-summary">
              <p>
                {(directions.distance / 1000).toFixed(2)} km ·{' '}
                {Math.round(directions.duration / 60)} min ·{' '}
                {Math.round(directions.elevation)} m elevation ·{' '}
                Safety {directions.safetyScore}/100
              </p>

              <button
                type="button"
                className="button primary"
                onClick={handleSave}
                disabled={!user || saved}
              >
                {saved ? 'Saved!' : 'Save route'}
              </button>

              <button
                type="button"
                className={
                  navigating
                    ? 'button secondary stop-nav'
                    : 'button secondary'
                }
                onClick={() => setNavigating((prev) => !prev)}
              >
                {navigating ? 'Stop Navigation' : 'Start Navigation'}
              </button>
            </div>
          )}

          {error && (
            <div className="routes-error" role="alert">
              {error}
            </div>
          )}

          {loading && (
            <p className="route-message">Calculating routes...</p>
          )}

          <div className="routes-map">
            <Map
              onMapClick={handleMapClick}
              route={{
                start,
                destination,
                path: directions?.path ?? [],
              }}
              flyTo={flyTo}
              hazards={hazards}
              liveLocation={liveLocation}
            />
          </div>
        </section>

        <aside
          className={
            user?.role === 'admin'
              ? 'saved-routes-panel with-admin'
              : 'saved-routes-panel'
          }
        >
          <section className="saved-route-section">
            <h2>Your routes</h2>

            <div className="saved-route-list">
              {routes.length === 0 && (
                <p className="routes-empty">No routes saved yet.</p>
              )}

              {routes.map((route) => (
                <article
                  key={route.route_id}
                  className="route-card saved-route-card"
                  onClick={() => handleSelectRoute(route)}
                >
                  <div>
                    <strong>
                      {route.start_name} → {route.destination_name}
                    </strong>

                    <p>
                      {(route.distance / 1000).toFixed(2)} km ·{' '}
                      {Math.round(route.duration / 60)} min ·{' '}
                      Safety {route.safety_score}/100
                    </p>
                  </div>

                  <button
                    type="button"
                    className="button danger"
                    aria-label="Delete route"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDelete(route.route_id!)
                    }}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          </section>

          {user?.role === 'admin' && (
            <section className="saved-route-section admin-route-section">
              <h2>All routes</h2>

              <div className="saved-route-list">
                {allRoutes.length === 0 && (
                  <p className="routes-empty">No routes exist yet.</p>
                )}

                {allRoutes.map((route) => (
                  <article
                    key={route.route_id}
                    className="route-card saved-route-card"
                    onClick={() => handleSelectRoute(route)}
                  >
                    <div>
                      <strong>
                        {route.start_name} → {route.destination_name}
                      </strong>

                      <p>
                        {(route.distance / 1000).toFixed(2)} km ·{' '}
                        {Math.round(route.duration / 60)} min ·{' '}
                        Safety {route.safety_score}/100 · User #
                        {route.created_by}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="button danger"
                      aria-label="Delete route"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDelete(route.route_id!)
                      }}
                    >
                      ×
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
