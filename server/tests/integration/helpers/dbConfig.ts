// Mirrors the DB_* env vars ci.yml sets for `npm run test:integration` (see
// .github/workflows/ci.yml's `server` job). Run a matching Postgres locally
// (e.g. `docker run -e POSTGRES_USER=paperless_llm -e POSTGRES_PASSWORD=testpassword
// -e POSTGRES_DB=paperless_llm_test -p 5432:5432 postgres:15-alpine`) and export
// the same vars, or rely on these defaults if your local Postgres matches them.
export const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'paperless_llm',
  password: process.env.DB_PASSWORD || 'testpassword',
  database: process.env.DB_NAME || 'paperless_llm_test',
};
