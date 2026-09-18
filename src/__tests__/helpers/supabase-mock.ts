import { vi } from "vitest";

/**
 * Shared fake Supabase client for Server Action and route handler tests.
 *
 * Extracted from the original inline mock in app/actions/bookings.test.ts so
 * that the payment actions and the webhook route test the same behaviour
 * rather than each growing a slightly different copy. This repo already
 * treats drift between two hand-maintained copies of one thing as a bug
 * (createBooking vs api/bookings/route.ts), and a test harness is no
 * different.
 *
 * Two deliberate properties:
 *
 *   * `createServiceClient` is exposed as well as `createClient`, and it is
 *     SYNCHRONOUS — that is the real shape in src/lib/supabase/server.ts. The
 *     webhook and every admin action use it, and a mock that only offered
 *     `createClient` silently returned undefined.
 *
 *   * An unstubbed table throws rather than returning empty. A test that
 *     touches a table it never described is a test that does not know what
 *     the code under test does.
 */

export interface QueryState {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  payload?: Record<string, unknown>;
  filters: Record<string, unknown>;
}

export interface QueryResult {
  data: unknown;
  error: unknown;
}

export type TableResponder = (state: QueryState) => QueryResult;
export type RpcResponder = (args: Record<string, unknown>) => QueryResult;

export interface WriteRecord {
  table: string;
  op: string;
  payload: Record<string, unknown>;
  filters: Record<string, unknown>;
}

export interface RpcRecord {
  name: string;
  args: Record<string, unknown>;
}

export const supabaseState = {
  user: null as { id: string } | null,
  /** Terminal result per table, in the order the code under test queries them. */
  responders: {} as Record<string, TableResponder>,
  /** Terminal result per RPC name. */
  rpcResponders: {} as Record<string, RpcResponder>,
  writes: [] as WriteRecord[],
  rpcCalls: [] as RpcRecord[],
};

/** Call in `beforeEach` so state never leaks between tests. */
export function resetSupabaseState(): void {
  supabaseState.user = null;
  supabaseState.responders = {};
  supabaseState.rpcResponders = {};
  supabaseState.writes = [];
  supabaseState.rpcCalls = [];
}

/**
 * A chainable PostgREST-ish builder. Filters are recorded so a test can assert
 * that ownership was re-enforced in the query itself, which is the pattern the
 * real actions use ("enforce ownership at the DB layer too").
 */
function makeBuilder(table: string) {
  const state: QueryState = { table, op: "select", filters: {} };

  const resolve = (): QueryResult => {
    const responder = supabaseState.responders[table];
    if (!responder) {
      throw new Error(`No mock responder registered for table "${table}"`);
    }
    return responder(state);
  };

  const recordWrite = (op: QueryState["op"], payload: Record<string, unknown>) => {
    state.op = op;
    state.payload = payload;
    supabaseState.writes.push({ table, op, payload, filters: state.filters });
  };

  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      state.filters[column] = value;
      return builder;
    },
    neq: (column: string, value: unknown) => {
      state.filters[`${column}:neq`] = value;
      return builder;
    },
    in: (column: string, values: unknown) => {
      state.filters[`${column}:in`] = values;
      return builder;
    },
    gte: (column: string, value: unknown) => {
      state.filters[`${column}:gte`] = value;
      return builder;
    },
    lte: (column: string, value: unknown) => {
      state.filters[`${column}:lte`] = value;
      return builder;
    },
    lt: (column: string, value: unknown) => {
      state.filters[`${column}:lt`] = value;
      return builder;
    },
    gt: (column: string, value: unknown) => {
      state.filters[`${column}:gt`] = value;
      return builder;
    },
    is: (column: string, value: unknown) => {
      state.filters[`${column}:is`] = value;
      return builder;
    },
    not: (column: string, _op: string, value: unknown) => {
      state.filters[`${column}:not`] = value;
      return builder;
    },
    or: (expression: string) => {
      state.filters[":or"] = expression;
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    insert: (payload: Record<string, unknown>) => {
      recordWrite("insert", payload);
      return builder;
    },
    update: (payload: Record<string, unknown>) => {
      recordWrite("update", payload);
      return builder;
    },
    upsert: (payload: Record<string, unknown>) => {
      recordWrite("upsert", payload);
      return builder;
    },
    delete: () => {
      recordWrite("delete", {});
      return builder;
    },
    single: async () => resolve(),
    maybeSingle: async () => resolve(),
    then: (onFulfilled: (r: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled),
  };

  return builder;
}

export function makeFakeClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: supabaseState.user }, error: null }),
    },
    from(table: string) {
      return makeBuilder(table);
    },
    rpc(name: string, args: Record<string, unknown> = {}) {
      supabaseState.rpcCalls.push({ name, args });
      const responder = supabaseState.rpcResponders[name];
      if (!responder) {
        throw new Error(`No mock responder registered for rpc "${name}"`);
      }
      return Promise.resolve(responder(args));
    },
  };
}

/**
 * The module factory for `vi.mock("@/lib/supabase/server", ...)`.
 *
 * `createClient` is async and `createServiceClient` is sync, mirroring
 * src/lib/supabase/server.ts exactly — getting that wrong produces a
 * confusing "not a function" far from the cause.
 */
export function supabaseServerMock() {
  return {
    createClient: vi.fn(async () => makeFakeClient()),
    createServiceClient: vi.fn(() => makeFakeClient()),
  };
}

/** Convenience: a responder that always returns this row. */
export function rows(data: unknown, error: unknown = null): TableResponder {
  return () => ({ data, error });
}

/** Convenience: a responder that returns a Postgres-shaped error. */
export function pgError(code: string, message: string): TableResponder {
  return () => ({ data: null, error: { code, message } });
}
