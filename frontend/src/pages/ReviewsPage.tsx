import { useCallback, useEffect, useState,type FormEvent } from 'react';
import type { CommunityReview, Route, User } from '../types';
import ReviewForm from '../components/ReviewForm';
import { routeApi, reviewApi } from '../services/api';

export default function ReviewsPage({ user }: { user: User }) {
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<CommunityReview | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  // Promise for whenever theres a change to the search conditions
  const loadReviews = useCallback(async () => {
    const data = await reviewApi.list({search, mine: onlyMine});
    setReviews(data as CommunityReview[]);
  }, [search, onlyMine]);

  // On start up, load and set up all the current reviews and routes lists
  useEffect(() => {
    Promise
      .all([reviewApi.list(), routeApi.list()])
      .then(([reviewList, routeList]) => {
        setReviews(reviewList as CommunityReview[]);
        setRoutes(routeList as Route[]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load reviews');
      })
      .finally(() => setBusy(false));
  }, []);

  // Load the reviews based on the conditions in loadReviews implementation
  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not search reviews');
    }
  }

  // Clean up the current search, and go back to the default community stage (basically all the reviews)
  async function clearSearch() {
    setSearch('');
    setOnlyMine(false);
    setError('');

    try {
      const data = await reviewApi.list();
      setReviews(data as CommunityReview[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reviews');
    }
  }

  async function handleSaved() {
    setShowForm(false);
    setEditingReview(null);
    await loadReviews();
  }

  async function handleDelete(reviewId: number) {
    setError('');

    try {
      await reviewApi.remove(reviewId);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete review');
    }
  }

  if (busy) {
    return <div className="page">Loading reviews...</div>;
  }

  return (
    <div className="page route-logs-page">
      <div className="Header & review section">
        <div>
          <h1>Community Reviews</h1>
        </div>

        <button type="button" className="button primary" onClick={() => {
            setEditingReview(null);
            setShowForm((current) => !current);
          }}
        >
          + Add review
        </button>
      </div>

      <form className="search-form card" onSubmit={handleSearch}>
        <label>
          Search by route, reviewer, or comment
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Central Park or smooth ride"/>
        </label>

        <label>
          <input type="checkbox" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)}/>
          My reviews only
        </label>

        <div className="Search section">
          <button type="submit" className="button primary">
            Search
          </button>
          <button type="button" className="button secondary" onClick={clearSearch}>
            Clear
          </button>
        </div>
      </form>

      {error && <div className="card">{error}</div>}

      {(showForm || editingReview) && (
        <ReviewForm routes={routes} review={editingReview} onSaved={handleSaved} onCancel={() => {
            setShowForm(false);
            setEditingReview(null);
          }}
        />
      )}

      <section className="Reviews section">
        <h2>Reviews Section</h2>
        {reviews.length === 0 ? (<div className="card text-muted">No matching reviews found.</div>) : (
          reviews.map((review) => (
            <article className="card" key={review.review_id}>
              <div className="card-header">
                <div>
                  <strong>
                    {review.start_name} → {review.destination_name}
                  </strong>
                  <p className="text-muted">Reviewed by {review.user_name}</p>
                </div>

                <strong>{review.review_rating.toFixed(1)} / 5</strong>
              </div>

              {review.comment && <p>{review.comment}</p>}

              <p className="text-muted">
                Route safety score: {review.safety_score.toFixed(1)} / 100
              </p>
              
              {review.user_id === user.user_id && (
                <div className="route-log-actions">
                  <button type="button" className="button secondary" onClick={() => {
                      setShowForm(false);
                      setEditingReview(review);
                    }}
                  >
                    Edit
                  </button>

                  <button type="button" className="button secondary" onClick={() => handleDelete(review.review_id)}>
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}