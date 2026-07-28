import {
  useState,
  type FormEvent,
} from 'react';

import {
  routeLogApi,
} from '../services/api';

export default function RouteReviewForm({
  routeLogId,
  onSaved,
}: {
  routeLogId: number;
  onSaved: () => void;
}) {
  const [overall, setOverall] =
    useState('5');

  const [safety, setSafety] =
    useState('5');

  const [difficulty, setDifficulty] =
    useState('3');

  const [comments, setComments] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      await routeLogApi.addReview(
        routeLogId,
        {
          overall_rating:
            Number(overall),

          safety_rating:
            Number(safety),

          difficulty_rating:
            Number(difficulty),

          comments,
        },
      );

      setComments('');
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save review',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card route-review-form"
      onSubmit={handleSubmit}
    >
      <h2>Review this ride</h2>

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
          placeholder="Traffic, bike lanes, hills, construction..."
        />
      </label>

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
          ? 'Saving...'
          : 'Save review'}
      </button>
    </form>
  );
}