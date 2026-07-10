## Checks

Check server is working with curl http://localhost:3001/api/health  

Check database connection is working with curl http://localhost:3001/api/health/db  

## Connect to psql directly

```bash
psql "DATABASE_URL"
```
- DATABASE_URL from .env file

## Run Migrations

Beacuse we are using shared db, only run old migrations if need to rebuild tables/sample data.
- Otherwise, create new migration and run that.

```bash
psql "DATABASE_URL"
    -v ON_ERROR_STOP=1
    -f migrations/1_schema.sql
```
- run from backend/ directory



