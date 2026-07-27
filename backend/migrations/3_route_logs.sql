BEGIN;

CREATE TABLE route_logs (
    route_log_id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Optional connection to Tim's planned route.
    planned_route_id INTEGER REFERENCES routes(route_id) ON DELETE SET NULL,

    -- Snapshots of the completed ride.
    start_name VARCHAR(255) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    elevation DECIMAL(10, 2) NOT NULL,
    distance DECIMAL(10, 2) NOT NULL,
    duration DECIMAL(10, 2) NOT NULL,

    -- Simple MVP street matching.
    street_names TEXT[] NOT NULL,

    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (elevation >= 0),
    CHECK (distance >= 0),
    CHECK (duration >= 0),
    CHECK (cardinality(street_names) > 0)
);

CREATE TABLE route_reviews (
    review_id SERIAL PRIMARY KEY,

    route_log_id INTEGER NOT NULL REFERENCES route_logs(route_log_id) ON DELETE CASCADE,

    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    overall_rating INTEGER NOT NULL,
    safety_rating INTEGER NOT NULL,
    difficulty_rating INTEGER NOT NULL,
    comments TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (overall_rating BETWEEN 1 AND 5),
    CHECK (safety_rating BETWEEN 1 AND 5),
    CHECK (difficulty_rating BETWEEN 1 AND 5),

    -- A user updates their existing review instead of duplicating it.
    UNIQUE (route_log_id, user_id)
);

COMMIT;