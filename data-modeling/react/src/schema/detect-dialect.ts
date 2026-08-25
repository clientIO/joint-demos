// Sniff the SQL dialect from tell-tale syntax, so an uploaded / pasted dump imports
// with the RIGHT per-dialect parser without the user having to know (or pick) it. This
// is the fix for "a pg_dump imported under the default sqlite parser": Postgres-only
// syntax (SERIAL, `ALTER TABLE ONLY`, casts, pg_dump's `SET` preamble) fails statement
// by statement under sqlite, so most tables + all FKs are silently lost.
//
// Kept in its OWN module (not import-sql.ts) on purpose: it's a pure regex with no
// node-sql-parser dependency, so the import dialog can call it eagerly to auto-pick the
// dialect while the heavy parser stays behind the dialog's dynamic import.
//
// Order matters: MySQL and Postgres carry unambiguous markers; sqlite is the permissive
// default (its grammar also accepts plain ANSI / bracketed / double-quoted DDL). Cheap
// enough (one regex pass over the head of the file) to run on every content change.

import type { Dialect } from './types';

export function detectDialect(sql: string): Dialect {
    const head = sql.slice(0, 50_000);
    // MySQL: backtick identifiers, storage engine, AUTO_INCREMENT, UNSIGNED, charset.
    if (/`|\bengine\s*=|\bauto_increment\b|\bunsigned\b|\bdefault\s+charset\b/i.test(head)) {
        return 'mysql';
    }
    // PostgreSQL: pg_dump preamble, serial types, `::type` casts, ownership, extensions,
    // `nextval(`, `ALTER TABLE ONLY`, `WITH (OIDS`.
    if (
        /\bset\s+statement_timeout\b|\b(?:big)?serial\b|\bcreate\s+extension\b|\bowner\s+to\b|::[a-z]|\bnextval\s*\(|\balter\s+table\s+only\b|\bwith\s*\(\s*oids\b/i.test(
            head,
        )
    ) {
        return 'postgres';
    }
    return 'sqlite';
}
