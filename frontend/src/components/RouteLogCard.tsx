import type {
  RouteLogSummary,
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

export default function RouteLogCard({
  routeLog,
  selected,
  onSelect,
}: {
  routeLog: RouteLogSummary;
  selected: boolean;
  onSelect: (
    routeLogId: number,
  ) => void;
}) {
  return (
    <button
      type="button"
      className={
        `card route-log-card${
          selected ? ' selected' : ''
        }`
      }
      onClick={() =>
        onSelect(routeLog.route_log_id)
      }
    >
      <div className="card-header">
        <strong>
          {routeLog.start_name}
          {' → '}
          {routeLog.destination_name}
        </strong>

        <span>
          {Number(
            routeLog
              .average_overall_rating,
          ).toFixed(1)}
          {' / 5'}
        </span>
      </div>

      <div className="route-log-metrics compact">
        <span>
          {formatDistance(
            routeLog.distance,
          )}
        </span>

        <span>
          {formatDuration(
            routeLog.duration,
          )}
        </span>

        <span>
          {Number(
            routeLog.elevation,
          ).toFixed(0)}
          {' m climb'}
        </span>
      </div>

      <div className="street-list">
        {routeLog.street_names
          .slice(0, 3)
          .map((street) => (
            <span
              className="street-chip"
              key={street}
            >
              {street}
            </span>
          ))}
      </div>

      <p className="text-muted">
        Safety{' '}
        {Number(
          routeLog
            .average_safety_rating,
        ).toFixed(1)}
        {' / 5 · '}

        {routeLog.review_count}{' '}
        review
        {Number(
          routeLog.review_count,
        ) === 1
          ? ''
          : 's'}
      </p>
    </button>
  );
}