import { useCallback, useEffect, useState,type FormEvent } from 'react';
import type { CommunityReview, Route, User } from '../types';
import ReviewForm from '../components/ReviewForm';
import { routeApi, reviewApi } from '../services/api';
import '../styles/ReviewsPage.css'

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
    <div className="reviews-page">
      <header className="reviews-header">
        <h1>Community Reviews</h1>
      </header>

      <div className="reviews-layout">
        <aside className="reviews-sidebar">
          <form
            className="reviews-search-panel"
            onSubmit={handleSearch}
          >
            <label className="reviews-search-field">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Route, reviewer, or comment"
              />
            </label>

            <label className="reviews-mine-filter">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(event) => setOnlyMine(event.target.checked)}
              />
              My reviews only
            </label>

            <div className="reviews-search-actions">
              <button type="submit" className="button primary">
                Search
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={clearSearch}
              >
                Clear
              </button>
            </div>
          </form>

          <button
            type="button"
            className={
              showForm || editingReview
                ? 'button secondary reviews-add-button'
                : 'button primary reviews-add-button'
            }
            onClick={() => {
              setEditingReview(null)
              setShowForm((current) => !current)
            }}
          >
            {showForm || editingReview ? 'Close form' : '+ Add review'}
          </button>

          {error && (
            <div className="reviews-error" role="alert">
              {error}
            </div>
          )}

          {(showForm || editingReview) && (
            <ReviewForm
              routes={routes}
              review={editingReview}
              onSaved={handleSaved}
              onCancel={() => {
                setShowForm(false)
                setEditingReview(null)
              }}
            />
          )}
        </aside>

        <section className="reviews-feed">
          <h2>Reviews</h2>

          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p className="reviews-empty">
                No matching reviews found.
              </p>
            ) : (
              reviews.map((review) => (
                <article
                  className="community-review-card"
                  key={review.review_id}
                >
                  <header className="community-review-header">
                    <div>
                      <strong>
                        {review.start_name} → {review.destination_name}
                      </strong>

                      <p>Reviewed by {review.user_name}</p>
                    </div>

                    <span className="review-rating">
                      {review.review_rating.toFixed(1)} / 5.0
                    </span>
                  </header>

                  {review.comment && (
                    <p className="review-comment">{review.comment}</p>
                  )}

                  <p className="review-safety">
                    Route safety score:{' '}
                    {review.safety_score.toFixed(1)} / 100.0
                  </p>

                  {review.user_id === user.user_id && (
                    <div className="review-actions">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setShowForm(false)
                          setEditingReview(review)
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="button secondary review-delete-button"
                        onClick={() => handleDelete(review.review_id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}