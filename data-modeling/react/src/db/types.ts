// Shared contract for the in-browser SQL engines. Design- and joint-independent:
// an engine takes a SQL string and returns tabular rows. Cell values are `unknown`
// on purpose — SQLite/Postgres hand back numbers, strings, blobs and nulls, and the
// UI narrows via String()/typeof at render time rather than the engine guessing.

// The two engines that actually EXECUTE SQL in the browser. MySQL is generate-only
// (handled elsewhere) and deliberately absent here.
export type EngineKind = 'sqlite' | 'postgres';

export interface QueryResult {
  readonly columns: readonly string[];
  // One inner array per row, column-aligned with `columns`.
  readonly rows: readonly (readonly unknown[])[];
  // Rows returned for a SELECT, or rows affected for INSERT/UPDATE/DELETE.
  readonly rowCount: number;
  // Wall-clock execution time; optional so engines that don't measure can omit it.
  readonly elapsedMs?: number;
}

export interface QueryError {
  readonly message: string;
}

export interface SqlEngine {
  readonly kind: EngineKind;
  // Runs one or more statements; resolves with the last statement's result.
  exec(sql: string): Promise<QueryResult>;
  // Drops all state back to an empty database.
  reset(): Promise<void>;
  // Frees the underlying WASM instance.
  dispose(): void;
}
