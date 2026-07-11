# Commands

## Checks

### Check server is running

```bash
curl.exe http://localhost:3001/api/health
```

### Check database connection

```bash
curl.exe http://localhost:3001/api/health/db
```

---

## Connect to PostgreSQL

Connect directly to the shared development database:

```bash
psql "DATABASE_URL"
```

Replace `DATABASE_URL` with the value from your local `.env` file.

Example:

```bash
psql "postgresql://bikesafe_user:password@34.xxx.xxx.xxx:5432/bikesafe_dev_db"
```

---

## API Testing (curl)

### Server Check

```bash
curl.exe http://localhost:3001/api/health
```

---

### Database Check

```bash
curl.exe http://localhost:3001/api/health/db
```

---

### Get All Hazards

```bash
curl.exe -X GET http://localhost:3001/api/hazards
```

---

### Get Hazard By ID

```bash
curl.exe -X GET http://localhost:3001/api/hazards/5
```

Replace `5` with the desired hazard ID.

---

### Get Hazard Statistics

```bash
curl.exe -X GET http://localhost:3001/api/hazards/stats
```

---

### Create a Hazard

```bash
curl.exe -X POST http://localhost:3001/api/hazards ^
-H "Content-Type: application/json" ^
-d "{\"user_id\":1,\"title\":\"Cement truck blocking bike lane\",\"description\":\"Cement truck for roadway construction is parked in the northbound bike lane\",\"category\":\"construction\",\"severity\":4,\"latitude\":49.2827,\"longitude\":-123.1207}"
```

---

### Update a Hazard

```bash
curl.exe -X PATCH http://localhost:3001/api/hazards/9 ^
-H "Content-Type: application/json" ^
-d "{\"title\":\"Construction blocking eastbound bike lane\",\"description\":\"Equipment partially blocks the eastbound bike lane.\",\"category\":\"construction\",\"current_status\":\"approved\",\"severity\":4,\"latitude\":49.2827,\"longitude\":-123.1207,\"image_url\":null}"
```

Replace `9` with the hazard ID you wish to update.

---

### Delete a Hazard

```bash
curl.exe -X DELETE http://localhost:3001/api/hazards/9
```

Replace `9` with the hazard ID you wish to delete.

---

## Pretty Printing JSON

To make API responses easier to read:

```bash
curl.exe -X GET http://localhost:3001/api/hazards | python -m json.tool
```

Example:

```bash
curl.exe -X GET http://localhost:3001/api/hazards/stats | python -m json.tool
```

---

## Running Migrations

Because we are using shared dev db:

- Don't rerun old migrations unless you have to intentionally rebuild the database.
- Create a new migration whenever you want to change anything about the schemas or database.
- Run migrations from the `backend/` directory.

### Initial Schema

```bash
psql "DATABASE_URL" ^
-v ON_ERROR_STOP=1 ^
-f migrations/001_initial_schema.sql
```

### Sample Data

```bash
psql "DATABASE_URL" ^
-v ON_ERROR_STOP=1 ^
-f migrations/002_sample_data.sql
```

### Future Migrations

```bash
psql "DATABASE_URL" ^
-v ON_ERROR_STOP=1 ^
-f migrations/003_migration_name.sql
```

---

## Current Hazard API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Verify backend is running |
| GET | `/api/health/db` | Verify PostgreSQL connection |
| GET | `/api/hazards` | Retrieve all hazards |
| GET | `/api/hazards/:id` | Retrieve a specific hazard |
| GET | `/api/hazards/stats` | Retrieve dashboard statistics |
| POST | `/api/hazards` | Create a new hazard |
| PATCH | `/api/hazards/:id` | Update an existing hazard |
| DELETE | `/api/hazards/:id` | Delete a hazard |

## REST Client

Instead of using curl commands yourself you can also download "REST Client" extension for VS Code and run the tests that are written in the api-tests/ directory