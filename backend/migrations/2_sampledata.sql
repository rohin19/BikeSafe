-- sample data for testing the db

BEGIN TRANSACTION;

INSERT INTO users (name, email, hashed_password, role) VALUES 
    ('Alice', 'alice@example.com', 'demo_pass_1', 'user'),
    ('Bob', 'bob@example.com', 'demo_pass_2', 'user'),  
    ('Charlie', 'charlie@example.com', 'demo_pass_3', 'user');

INSERT INTO routes (start_name, start_latitude, start_longitude, destination_name,
    destination_latitude, destination_longitude, elevation, distance, duration,
    safety_score, created_by) VALUES 
    ('Science World', 49.273468, -123.102911, 'BC Place', 49.276721, -123.112381, 13.5, 1200, 300, 70, (SELECT user_id FROM users WHERE name = 'Alice')),
    ('Trout Lake', 49.254207, -123.061951, 'Jericho Beach', 49.272099, -123.198737, 10.0, 15500, 3600, 90, (SELECT user_id FROM users WHERE name = 'Bob'));

INSERT INTO hazards (user_id, title, description, category, current_status, severity, latitude, longitude) VALUES 
    ((SELECT user_id FROM users WHERE name = 'Alice'), 'Pothole on Main St', 'A large pothole causing traffic issues.', 'Road Condition', 'reported', 3, 49.2827, -123.1207),
    ((SELECT user_id FROM users WHERE name = 'Bob'), 'Fallen Tree on Trail', 'A fallen tree blocking the trail.', 'Obstacle', 'in_progress', 4, 49.2820, -123.1150);

INSERT INTO reviews (route_id, user_id, review_rating, comment) VALUES 
    ((SELECT route_id FROM routes WHERE start_name = 'Science World' AND destination_name = 'BC Place'), (SELECT user_id FROM users WHERE name = 'Alice'), 4.5, 'Nice route with some traffic.'),
    ((SELECT route_id FROM routes WHERE start_name = 'Trout Lake' AND destination_name = 'Jericho Beach'), (SELECT user_id FROM users WHERE name = 'Bob'), 2.3, 'Ok route lots of traffic and hazards.');

INSERT INTO route_hazards (route_id, hazard_id) VALUES 
    ((SELECT route_id FROM routes WHERE start_name = 'Science World' AND destination_name = 'BC Place'), (SELECT hazard_id FROM hazards WHERE title = 'Pothole on Main St')),
    ((SELECT route_id FROM routes WHERE start_name = 'Trout Lake' AND destination_name = 'Jericho Beach'), (SELECT hazard_id FROM hazards WHERE title = 'Fallen Tree on Trail'));

COMMIT;