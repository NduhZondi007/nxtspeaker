#!/usr/bin/env bash
# Rebuilds a throwaway database from supabase/migrations and runs the SQL
# security tests in supabase/tests against it. Needs a reachable Postgres 15+
# superuser (PGHOST/PGPORT/PGUSER/PGPASSWORD); CI provides one as a service.
#
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres scripts/test-db.sh
set -euo pipefail

DB="${TEST_DB_NAME:-nxt_rls_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS \"$DB\"" -c "CREATE DATABASE \"$DB\""

echo "== stub + migrations"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "$DB" -f "$f" >/dev/null 2>&1 || { echo "migration failed: $f"; "${PSQL[@]}" -d "$DB" -f "$f" 2>&1 | grep ERROR; exit 1; }
done
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/01_helpers_and_fixtures.sql" >/dev/null || { echo "fixtures failed"; exit 1; }

# Test files run WITHOUT ON_ERROR_STOP: every block is its own transaction,
# so one failing assertion must not hide the ones after it.
status=0
for f in "$ROOT"/supabase/tests/[1-9]*.test.sql; do
  echo "== $(basename "$f")"
  out="$(psql -q -X -d "$DB" -f "$f" 2>&1 || true)"
  printf '%s\n' "$out" | grep -oE '(ok   - .*|FAIL - .*|ERROR: .*)' | grep -v 'current transaction is aborted' | sed 's/^/  /'
  if printf '%s\n' "$out" | grep -q 'ERROR:'; then status=1; fi
done
[ $status -eq 0 ] && echo "all database tests passed" || echo "database tests FAILED"
exit $status
