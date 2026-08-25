// Owns the active SQL engine for the demo. Engines are created lazily and cached
// one-per-kind in a ref, so switching sqlite <-> postgres and back keeps each
// database's state. There are NO state-updating effects and NO ref reads during
// render: engine creation happens inside the `run` async callback, where ref
// access is allowed. The pglite WASM load stays lazy (it fires inside
// engine.exec); the `isLoading` flag reflects an in-flight run.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSqliteEngine } from '@/db/sqlite-engine';
import { createPostgresEngine } from '@/db/postgres-engine';
import type { EngineKind, QueryError, QueryResult, SqlEngine } from '@/db/types';

const FACTORIES: Record<EngineKind, () => SqlEngine> = {
    sqlite: createSqliteEngine,
    postgres: createPostgresEngine,
};

export interface UseSqlEngineResult {
  readonly kind: EngineKind;
  readonly setKind: (kind: EngineKind) => void;
  // Resolves with the result, or undefined when the query errored (see `error`).
  readonly run: (sql: string) => Promise<QueryResult | undefined>;
  // Applies `ddl` (and optional imported `data` INSERTs) to the active engine. A
  // no-op while the schema (this exact `ddl` + `data`) is unchanged, so INSERT/DELETE
  // state accumulates across runs; when it changes, the DB is reset and re-applied.
  // False on DDL failure; `data` is best-effort (see below).
  readonly ensureSeeded: (ddl: string, data?: string) => Promise<boolean>;
  // Drops the active DB back to empty and re-applies `ddl` (+ `data`) from scratch.
  readonly reset: (ddl: string, data?: string) => Promise<boolean>;
  readonly isLoading: boolean;
  readonly error: QueryError | null;
}

export function useSqlEngine(
    initialKind: EngineKind = 'sqlite',
): UseSqlEngineResult {
    const [kind, setKind] = useState<EngineKind>(initialKind);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<QueryError | null>(null);

    // One instance per kind, created on first request and reused thereafter.
    const enginesRef = useRef<Map<EngineKind, SqlEngine>>(new Map());
    const getEngine = useCallback((target: EngineKind): SqlEngine => {
        const cache = enginesRef.current;
        const existing = cache.get(target);
        if (existing) return existing;
        const created = FACTORIES[target]();
        cache.set(target, created);
        return created;
    }, []);

    // Free WASM instances when the hook unmounts. Cleanup-only — no state updates.
    useEffect(() => {
        const cache = enginesRef.current;
        return () => {
            for (const instance of cache.values()) instance.dispose();
        };
    }, []);

    const run = useCallback(
        async(sql: string): Promise<QueryResult | undefined> => {
            setLoading(true);
            setError(null);
            try {
                return await getEngine(kind).exec(sql);
            } catch (caught) {
                const message = caught instanceof Error ? caught.message : String(caught);
                setError({ message });
                return undefined;
            } finally {
                setLoading(false);
            }
        },
        [getEngine, kind],
    );

    // The exact DDL each engine was last seeded with, so seeding is skipped while the
    // schema is unchanged (persistent INSERT state survives) but re-applied after an
    // edit. The DDL string is the schema fingerprint (generateDdl is deterministic).
    const seededRef = useRef<Map<EngineKind, string>>(new Map());

    const ensureSeeded = useCallback(
        async(ddl: string, data = ''): Promise<boolean> => {
            // Fingerprint covers ddl AND data, so a fresh import (new data, same-ish ddl)
            // re-seeds. \0 separator can't occur in either half, so the pair is unambiguous.
            const fingerprint = `${ddl}\u0000${data}`;
            const last = seededRef.current.get(kind);
            if (last === fingerprint) return true;
            // Schema changed since the last seed: drop the stale tables before re-applying
            // (a fresh engine has nothing to reset, so only reset when we've seeded before).
            if (last !== undefined) await getEngine(kind).reset();
            const applied = await run(ddl);
            if (applied === undefined) return false;
            if (data) {
                // Imported dump data is BEST-EFFORT: the schema may have been edited since the
                // import (a dropped column, a renamed table), making old INSERTs invalid. That
                // must not fail seeding or surface as a query error — direct engine exec, not
                // run(), so a data hiccup stays silent and the DDL seed stands.
                try {
                    await getEngine(kind).exec(data);
                } catch {
                    // ponytail: partial/failed data load is acceptable; the schema still works.
                }
            }
            seededRef.current.set(kind, fingerprint);
            return true;
        },
        [getEngine, kind, run],
    );

    const reset = useCallback(
        async(ddl: string, data = ''): Promise<boolean> => {
            setError(null);
            await getEngine(kind).reset();
            seededRef.current.delete(kind);
            return ensureSeeded(ddl, data);
        },
        [getEngine, kind, ensureSeeded],
    );

    // Switching engines clears the previous one's error but keeps its data cached.
    const switchKind = useCallback((next: EngineKind): void => {
        setKind(next);
        setError(null);
    }, []);

    return { kind, setKind: switchKind, run, ensureSeeded, reset, isLoading, error };
}
