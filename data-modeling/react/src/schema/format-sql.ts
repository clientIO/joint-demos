// Pretty-print generated SQL. Thin wrapper over sql-formatter mapping our
// Dialect to its `language` param (note: postgres -> 'postgresql').

import { format } from 'sql-formatter';
import type { SqlLanguage } from 'sql-formatter';
import type { Dialect } from './types';

const LANGUAGE: Readonly<Record<Dialect, SqlLanguage>> = {
    sqlite: 'sqlite',
    postgres: 'postgresql',
    mysql: 'mysql',
};

export function formatSql(sql: string, dialect: Dialect): string {
    return format(sql, { language: LANGUAGE[dialect] });
}
