import { useEffect, useState, type FormEvent } from 'react';
import type { CommunityReview, Route } from '../types';
import { reviewApi } from '../services/api';

interface ReviewFormProps {
  routes: Route[];
  review?: CommunityReview | null;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ReviewForm({routes, review = null, onSaved, onCancel}: ReviewFormProps) {
  const [routeId, setRouteId] = useState(review?.route_id ?? routes[0]?.route_id ?? 0);
  const [rating, setRating] = useState(review?.review_rating ?? 5);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Update current status on initialization, and whenever review or route changes
  useEffect(() => {
    setRouteId(review?.route_id ?? routes[0]?.route_id ?? 0);
    setRating(review?.review_rating ?? 5);
    setComment(review?.comment ?? '');
  }, [review, routes]);

  // Generate the Review form and insert it into the database
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    // If review already existed (ie we're editing), update it, else create a new one
    try {
      if (review) {
        await reviewApi.update(review.review_id, {
          review_rating: Number(rating),
          comment
        });
      } else {
        await reviewApi.create({
          route_id: Number(routeId),
          review_rating: Number(rating),
          comment
        });
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review');
    } finally {
      setBusy(false);
    }
  }

  // If nothing exists, such that there's neither routes or previous reviews to work with, then we need to create them first
  if (!review && routes.length === 0) {
    return (
      <div className="card">
        Create a route before adding a review.
      </div>
    );
  }

  return (
    <form className="review-card" onSubmit={handleSubmit}>
      <h2>{review ? 'Edit review' : 'Add review'}</h2>

      <label>
        Route
        <select value={routeId} disabled={Boolean(review)} onChange={(event) => setRouteId(Number(event.target.value))}>
          {routes.map((route) => (
            <option key={route.route_id} value={route.route_id}>
              {route.start_name} → {route.destination_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Rating
        <input type="number" min="0" max="5" step="0.5" required value={rating} onChange={(event) => setRating(Number(event.target.value))}/>
      </label>

      <label>
        Comment
        <textarea maxLength={255} value={comment} onChange={(event) => setComment(event.target.value)}/>
      </label>

      {error && <div>{error}</div>}

      <div>
        <button className="button primary" disabled={busy} type="submit">
          {busy ? 'Saving...' : 'Save review'}
        </button>

        <button className="button secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}