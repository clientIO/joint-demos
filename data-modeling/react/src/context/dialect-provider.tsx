import { useMemo, useState, type ReactNode } from 'react';
import type { Dialect } from '../schema/types';
import { DialectContext, type DialectApi } from './dialect-context';

export function DialectProvider({ children }: { readonly children: ReactNode }) {
    // SQLite is the default (it executes in-browser); Postgres executes lazily,
    // MySQL is generate-only.
    const [dialect, setDialect] = useState<Dialect>('sqlite');
    const value = useMemo<DialectApi>(() => ({ dialect, setDialect }), [dialect]);
    return <DialectContext.Provider value={value}>{children}</DialectContext.Provider>;
}
