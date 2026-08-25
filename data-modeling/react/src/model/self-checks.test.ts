// Runs the repo's existing runnable self-checks (the `*.check.ts` assertion
// functions) under vitest, so they finally execute in CI instead of only being
// callable from a scratch script / the browser console. New assertions should go
// in the focused *.test.ts files; these keep the legacy checks honest.

import { describe, it } from 'vitest';
import { runImportChecks } from '@/schema/import-sql.check';
import { runGenerateChecks } from '@/schema/generate-ddl.check';
import { runSchemaCellsChecks, runApplySqlChecks } from '@/model/schema-cells.check';
import { runGroupCollapseCheck } from '@/canvas/group-collapse.check';

describe('self-checks (*.check.ts)', () => {
    it('import-sql', () => runImportChecks());
    it('generate-ddl', () => runGenerateChecks());
    it('schema-cells round trip', () => runSchemaCellsChecks());
    it('applySqlSchema id reuse', () => runApplySqlChecks());
    it('group-collapse', () => runGroupCollapseCheck());
});
