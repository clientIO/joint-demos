// The active SQL dialect (sqlite | postgres | mysql), shared across the toolbar,
// export, inspector, SQL editor and query runner. Context + hook live here (no
// component) so the provider file stays a clean fast-refresh boundary.

import { createContext, useContext } from 'react';
import type { Dialect } from '../schema/types';

// The single source of truth for the dialect list + display labels, shared by the
// toolbar switcher, the import dialog, and the SQL panel (each previously kept its
// own copy — adding a dialect meant editing several arrays).
export const DIALECTS: readonly { readonly value: Dialect; readonly label: string }[] = [
    { value: 'sqlite', label: 'SQLite' },
    { value: 'postgres', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
];

export const DIALECT_VALUES: readonly Dialect[] = DIALECTS.map((option) => option.value);

// Display label for a dialect, derived from the single DIALECTS source (a function,
// not a prebuilt Record, so there is no second source of truth and no cast to make
// the map total). The union is exhaustive, so the fallback never fires.
export function dialectLabel(dialect: Dialect): string {
    return DIALECTS.find((option) => option.value === dialect)?.label ?? dialect;
}

export interface DialectApi {
  readonly dialect: Dialect;
  readonly setDialect: (dialect: Dialect) => void;
}

export const DialectContext = createContext<DialectApi | null>(null);

export function useDialect(): DialectApi {
    const value = useContext(DialectContext);
    if (value === null) throw new Error('useDialect must be used within <DialectProvider>');
    return value;
}
