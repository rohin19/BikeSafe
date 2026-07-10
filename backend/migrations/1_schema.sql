-- user entity
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (role in ('user', 'admin'))
);

-- route entity
CREATE TABLE routes (
    route_id SERIAL PRIMARY KEY,
    start_name VARCHAR(255) NOT NULL,
    start_latitude DECIMAL(10, 6) NOT NULL,
    start_longitude DECIMAL(10, 6) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_latitude DECIMAL(10, 6) NOT NULL,
    destination_longitude DECIMAL(10, 6) NOT NULL,
    elevation DECIMAL(10, 2) NOT NULL,
    distance DECIMAL(10, 2) NOT NULL,
    duration DECIMAL(10, 2) NOT NULL,
    safety_score DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,

    CHECK (start_latitude >= -90 AND start_latitude <= 90),
    CHECK (start_longitude >= -180 AND start_longitude <= 180),
    CHECK (destination_latitude >= -90 AND destination_latitude <= 90),
    CHECK (destination_longitude >= -180 AND destination_longitude <= 180),
    CHECK (elevation >= 0),
    CHECK (distance >= 0),
    CHECK (duration >= 0),
    CHECK (safety_score >= 0 AND safety_score <= 100)
);

-- hazards entity
CREATE TABLE hazards (
    hazard_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'reported',
    severity INTEGER NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (severity >= 1 AND severity <= 5),
    CHECK (latitude >= -90 AND latitude <= 90),
    CHECK (longitude >= -180 AND longitude <= 180)
);

-- review entity
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    review_rating DECIMAL(2, 1) NOT NULL,
    comment VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (review_rating >= 0 AND review_rating <= 5)
);

-- route hazard entity
CREATE TABLE route_hazards (
    route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    hazard_id INTEGER NOT NULL REFERENCES hazards(hazard_id) ON DELETE CASCADE,
    PRIMARY KEY (route_id, hazard_id)
);