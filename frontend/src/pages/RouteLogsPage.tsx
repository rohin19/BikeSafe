import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import LogRouteForm
  from '../components/LogRouteForm';

import RouteLogCard
  from '../components/RouteLogCard';

import RouteReviewForm
  from '../components/RouteReviewForm';

import {
  hazardApi,
  routeApi,
  routeLogApi,
} from '../services/api';

import type {
  Hazard,
  Route,
  RouteLogDetail,
  RouteLogSummary,
  User,
} from '../types';

function formatDistance(
  metres: number,
) {
  return `${
    (Number(metres) / 1000).toFixed(1)
  } km`;
}

function formatDuration(
  seconds: number,
) {
  return `${
    Math.round(Number(seconds) / 60)
  } min`;
}

export default function RouteLogsPage({
  user,
}: {
  user: User;
}) {
  const [
    routeLogs,
    setRouteLogs,
  ] = useState<RouteLogSummary[]>([]);

  const [
    plannedRoutes,
    setPlannedRoutes,
  ] = useState<Route[]>([]);

  const [
    hazards,
    setHazards,
  ] = useState<Hazard[]>([]);

  const [
    selectedLog,
    setSelectedLog,
  ] = useState<RouteLogDetail | null>(
    null,
  );

  const [
    streetQuery,
    setStreetQuery,
  ] = useState('');

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [busy, setBusy] =
    useState(true);

  const [
    detailBusy,
    setDetailBusy,
  ] = useState(false);

  const [error, setError] =
    useState('');

  const loadRouteLogs = useCallback(
    async (streets = '') => {
      const data =
        await routeLogApi.list({
          streets,
        });

      setRouteLogs(data);

      return data as RouteLogSummary[];
    },
    [],
  );

  const loadDetails = useCallback(
    async (routeLogId: number) => {
      setDetailBusy(true);
      setError('');

      try {
        const data =
          await routeLogApi.get(
            routeLogId,
          );

        setSelectedLog(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load route log',
        );
      } finally {
        setDetailBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    Promise.all([
      loadRouteLogs(),
      routeApi.list(),
      hazardApi.list(),
    ])
      .then(
        ([
          ,
          savedRoutes,
          hazardList,
        ]) => {
          /*
           * Read Tim's routes only.
           * This does not modify his route
           * planning feature.
           */
          setPlannedRoutes(
            (
              savedRoutes as Route[]
            ).filter(
              (route) =>
                route.created_by ===
                user.user_id,
            ),
          );

          setHazards(hazardList);
        },
      )
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load ride logs',
        ),
      )
      .finally(() =>
        setBusy(false),
      );
  }, [
    loadRouteLogs,
    user.user_id,
  ]);

  async function handleStreetSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSelectedLog(null);

    try {
      setError('');

      await loadRouteLogs(
        streetQuery,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not search ride logs',
      );
    }
  }

  async function clearStreetSearch() {
    setStreetQuery('');
    setSelectedLog(null);

    try {
      setError('');
      await loadRouteLogs();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load ride logs',
      );
    }
  }

  async function handleCreated(
    routeLogId: number,
  ) {
    setShowForm(false);

    await loadRouteLogs();
    await loadDetails(routeLogId);
  }

  async function refreshSelectedLog() {
    if (!selectedLog) {
      return;
    }

    await Promise.all([
      loadRouteLogs(streetQuery),

      loadDetails(
        selectedLog.route_log_id,
      ),
    ]);
  }

  if (busy) {
    return (
      <div className="page">
        Loading ride logs...
      </div>
    );
  }

  return (
    <div className="page route-logs-page">
      <div className="route-log-toolbar">
        <div>
          <p className="text-muted">
            Completed trips and
            community reviews
          </p>

          <h1>Ride Logs</h1>
        </div>

        <button
          type="button"
          className={
            'button primary ' +
            'compact-button'
          }
          onClick={() =>
            setShowForm(
              (current) => !current,
            )
          }
        >
          + Log ride
        </button>
      </div>

      <form
        className={
          'route-log-search card'
        }
        onSubmit={handleStreetSearch}
      >
        <label>
          Find reviews from matching
          streets

          <input
            value={streetQuery}
            onChange={(event) =>
              setStreetQuery(
                event.target.value,
              )
            }
            placeholder="Ontario St, E 10th Ave"
          />
        </label>

        <div className="route-log-actions">
          <button
            type="submit"
            className="button primary"
          >
            Search
          </button>

          <button
            type="button"
            className="button secondary"
            onClick={clearStreetSearch}
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="card">
          {error}
        </div>
      )}

      {showForm && (
        <LogRouteForm
          plannedRoutes={plannedRoutes}
          hazards={hazards}
          onCreated={handleCreated}
          onCancel={() =>
            setShowForm(false)
          }
        />
      )}

      <section
        className="route-log-list"
        aria-label={
          'Community ride logs'
        }
      >
        {routeLogs.length === 0 ? (
          <div className="card text-muted">
            No matching ride logs found.
          </div>
        ) : (
          routeLogs.map((routeLog) => (
            <RouteLogCard
              key={
                routeLog.route_log_id
              }
              routeLog={routeLog}
              selected={
                selectedLog
                  ?.route_log_id ===
                routeLog.route_log_id
              }
              onSelect={loadDetails}
            />
          ))
        )}
      </section>

      {detailBusy && (
        <div className="card">
          Loading ride details...
        </div>
      )}

      {selectedLog && !detailBusy && (
        <section className="route-log-detail">
          <div className="card">
            <p className="text-muted">
              Logged by{' '}
              {selectedLog.logged_by_name}
            </p>

            <h2>
              {selectedLog.start_name}
              {' → '}
              {
                selectedLog
                  .destination_name
              }
            </h2>

            <div className="route-log-metrics">
              <div>
                <strong>
                  {formatDistance(
                    selectedLog.distance,
                  )}
                </strong>

                <span>Distance</span>
              </div>

              <div>
                <strong>
                  {Number(
                    selectedLog.elevation,
                  ).toFixed(0)}
                  {' m'}
                </strong>

                <span>Elevation</span>
              </div>

              <div>
                <strong>
                  {formatDuration(
                    selectedLog.duration,
                  )}
                </strong>

                <span>Duration</span>
              </div>

              <div>
                <strong>
                  {Number(
                    selectedLog
                      .average_safety_rating,
                  ).toFixed(1)}
                  {' / 5'}
                </strong>

                <span>
                  Community safety
                </span>
              </div>
            </div>

            <div className="street-list">
              {selectedLog.street_names.map(
                (street) => (
                  <span
                    className="street-chip"
                    key={street}
                  >
                    {street}
                  </span>
                ),
              )}
            </div>
          </div>

          <RouteReviewForm
            routeLogId={
              selectedLog.route_log_id
            }
            onSaved={
              refreshSelectedLog
            }
          />

          <div className="card">
            <h2>Community reviews</h2>

            {selectedLog.reviews
              .length === 0 ? (
              <p className="text-muted">
                No reviews yet.
              </p>
            ) : (
              selectedLog.reviews.map(
                (review) => (
                  <article
                    className={
                      'route-review-item'
                    }
                    key={review.review_id}
                  >
                    <div className="card-header">
                      <strong>
                        {review.user_name}
                      </strong>

                      <span>
                        {
                          review
                            .overall_rating
                        }
                        {' / 5'}
                      </span>
                    </div>

                    <p className="text-muted">
                      Safety{' '}
                      {
                        review
                          .safety_rating
                      }
                      /5 · Difficulty{' '}
                      {
                        review
                          .difficulty_rating
                      }
                      /5
                    </p>

                    {review.comments && (
                      <p>
                        {review.comments}
                      </p>
                    )}
                  </article>
                ),
              )
            )}
          </div>

          <div className="card">
            <h2>
              Other rides sharing
              these streets
            </h2>

            {selectedLog.related_logs
              .length === 0 ? (
              <p className="text-muted">
                No related ride logs yet.
              </p>
            ) : (
              selectedLog.related_logs.map(
                (related) => (
                  <button
                    type="button"
                    className={
                      'related-route-log'
                    }
                    key={
                      related.route_log_id
                    }
                    onClick={() =>
                      loadDetails(
                        related
                          .route_log_id,
                      )
                    }
                  >
                    <strong>
                      {related.start_name}
                      {' → '}
                      {
                        related
                          .destination_name
                      }
                    </strong>

                    <span className="text-muted">
                      Shared:{' '}
                      {
                        related.shared_streets
                          .join(', ')
                      }
                    </span>
                  </button>
                ),
              )
            )}
          </div>

          <div className="card">
            <h2>Linked hazards</h2>

            {selectedLog.hazards
              .length === 0 ? (
              <p className="text-muted">
                No hazards were linked
                to this ride.
              </p>
            ) : (
              selectedLog.hazards.map(
                (hazard) => (
                  <div
                    className={
                      'route-review-item'
                    }
                    key={hazard.hazard_id}
                  >
                    <strong>
                      {hazard.title}
                    </strong>

                    <span className="text-muted">
                      {hazard.category}
                      {' · Severity '}
                      {hazard.severity}/5
                    </span>
                  </div>
                ),
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}