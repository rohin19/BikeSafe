import {
  useState,
  type FormEvent,
} from 'react';

import {
  routeLogApi,
} from '../services/api';

import type {
  Hazard,
  Route,
} from '../types';

export default function LogRouteForm({
  plannedRoutes,
  hazards,
  onCreated,
  onCancel,
}: {
  plannedRoutes: Route[];
  hazards: Hazard[];
  onCreated: (
    routeLogId: number,
  ) => void;
  onCancel: () => void;
}) {
  const [
    plannedRouteId,
    setPlannedRouteId,
  ] = useState('');

  const [
    startName,
    setStartName,
  ] = useState('');

  const [
    destinationName,
    setDestinationName,
  ] = useState('');

  const [
    distanceKm,
    setDistanceKm,
  ] = useState('');

  const [
    elevation,
    setElevation,
  ] = useState('');

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState('');

  const [streets, setStreets] =
    useState('');

  const [hazardIds, setHazardIds] =
    useState<number[]>([]);

  const [overall, setOverall] =
    useState('5');

  const [safety, setSafety] =
    useState('5');

  const [
    difficulty,
    setDifficulty,
  ] = useState('3');

  const [comments, setComments] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  function choosePlannedRoute(
    value: string,
  ) {
    setPlannedRouteId(value);

    const route = plannedRoutes.find(
      (item) =>
        item.route_id === Number(value),
    );

    if (!route) {
      return;
    }

    setStartName(route.start_name);

    setDestinationName(
      route.destination_name,
    );

    setDistanceKm(
      (
        Number(route.distance) / 1000
      ).toFixed(2),
    );

    setElevation(
      String(route.elevation),
    );

    setDurationMinutes(
      String(
        Math.round(
          Number(route.duration) / 60,
        ),
      ),
    );
  }

  function toggleHazard(
    hazardId: number,
  ) {
    setHazardIds((current) =>
      current.includes(hazardId)
        ? current.filter(
            (id) => id !== hazardId,
          )
        : [...current, hazardId],
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      const result =
        await routeLogApi.create({
          planned_route_id:
            plannedRouteId
              ? Number(plannedRouteId)
              : null,

          start_name: startName,

          destination_name:
            destinationName,

          elevation:
            Number(elevation),

          // Store metres, consistent
          // with Tim's route data.
          distance:
            Number(distanceKm) * 1000,

          // Store seconds, consistent
          // with Tim's route data.
          duration:
            Number(durationMinutes) *
            60,

          street_names: streets
            .split(',')
            .map((street) =>
              street.trim(),
            )
            .filter(Boolean),

          hazard_ids: hazardIds,

          initial_review: {
            overall_rating:
              Number(overall),

            safety_rating:
              Number(safety),

            difficulty_rating:
              Number(difficulty),

            comments,
          },
        });

      onCreated(
        result.route_log.route_log_id,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not log route',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card route-log-form"
      onSubmit={handleSubmit}
    >
      <div className="card-header">
        <h2>Log a completed ride</h2>

        <button
          type="button"
          className="button danger"
          onClick={onCancel}
        >
          X
        </button>
      </div>

      <label>
        Start from one of your saved
        routes (optional)

        <select
          value={plannedRouteId}
          onChange={(event) =>
            choosePlannedRoute(
              event.target.value,
            )
          }
        >
          <option value="">
            Manual route
          </option>

          {plannedRoutes.map((route) => (
            <option
              key={route.route_id}
              value={route.route_id}
            >
              {route.start_name}
              {' → '}
              {route.destination_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Start

        <input
          value={startName}
          onChange={(event) =>
            setStartName(
              event.target.value,
            )
          }
          required
        />
      </label>

      <label>
        Destination

        <input
          value={destinationName}
          onChange={(event) =>
            setDestinationName(
              event.target.value,
            )
          }
          required
        />
      </label>

      <label>
        Streets used, separated by commas

        <input
          value={streets}
          onChange={(event) =>
            setStreets(
              event.target.value,
            )
          }
          placeholder="Ontario St, E 10th Ave, Yukon St"
          required
        />
      </label>

      <div className="route-log-form-grid">
        <label>
          Distance (km)

          <input
            type="number"
            min="0"
            step="0.1"
            value={distanceKm}
            onChange={(event) =>
              setDistanceKm(
                event.target.value,
              )
            }
            required
          />
        </label>

        <label>
          Elevation (m)

          <input
            type="number"
            min="0"
            step="1"
            value={elevation}
            onChange={(event) =>
              setElevation(
                event.target.value,
              )
            }
            required
          />
        </label>

        <label>
          Duration (min)

          <input
            type="number"
            min="0"
            step="1"
            value={durationMinutes}
            onChange={(event) =>
              setDurationMinutes(
                event.target.value,
              )
            }
            required
          />
        </label>
      </div>

      <div className="rating-row">
        <label>
          Overall

          <select
            value={overall}
            onChange={(event) =>
              setOverall(
                event.target.value,
              )
            }
          >
            {[1, 2, 3, 4, 5].map(
              (value) => (
                <option key={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Safety

          <select
            value={safety}
            onChange={(event) =>
              setSafety(
                event.target.value,
              )
            }
          >
            {[1, 2, 3, 4, 5].map(
              (value) => (
                <option key={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Difficulty

          <select
            value={difficulty}
            onChange={(event) =>
              setDifficulty(
                event.target.value,
              )
            }
          >
            {[1, 2, 3, 4, 5].map(
              (value) => (
                <option key={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      <label>
        Comments

        <textarea
          rows={3}
          value={comments}
          onChange={(event) =>
            setComments(
              event.target.value,
            )
          }
          placeholder="How safe and comfortable was the ride?"
        />
      </label>

      {hazards.length > 0 && (
        <fieldset className="hazard-picker">
          <legend>
            Hazards encountered
            (optional)
          </legend>

          {hazards
            .slice(0, 6)
            .map((hazard) => (
              <label
                className="hazard-option"
                key={hazard.hazard_id}
              >
                <input
                  type="checkbox"
                  checked={hazardIds.includes(
                    hazard.hazard_id,
                  )}
                  onChange={() =>
                    toggleHazard(
                      hazard.hazard_id,
                    )
                  }
                />

                <span>
                  {hazard.title}
                </span>
              </label>
            ))}
        </fieldset>
      )}

      {error && (
        <p className="text-muted">
          {error}
        </p>
      )}

      <button
        className="button primary"
        type="submit"
        disabled={busy}
      >
        {busy
          ? 'Logging...'
          : 'Log completed ride'}
      </button>
    </form>
  );
}