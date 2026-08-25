// Toolbar button that loads an .sql file's text INTO the query editor (it does not
// run it). Mirrors import-dialog.tsx's file-reading pattern: a hidden <input> in
// JSX triggered by a ref click, read via `await file.text()`.

import { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SqlFileImportButtonProps {
  // Called with the file's text so the caller can replace the editor contents.
  readonly onLoad: (text: string) => void;
  readonly disabled?: boolean;
}

export function SqlFileImportButton({ onLoad, disabled }: SqlFileImportButtonProps) {
    const fileInput = useRef<HTMLInputElement>(null);

    const onChange = useCallback(
        async(event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            // Reset first so re-picking the SAME file still fires change next time.
            event.target.value = '';
            if (!file) return; // empty / cancelled pick — do nothing
            // ponytail: load, don't auto-run — a huge multi-statement file shouldn't
            // execute on selection; the user reviews then hits Run.
            onLoad(await file.text());
        },
        [onLoad],
    );

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={disabled}
                aria-label="Import an SQL file into the editor"
                title="Load an .sql file into the editor (does not run it)"
            >
                <Upload />
        Import .sql
            </Button>
            <input
                ref={fileInput}
                type="file"
                accept=".sql,text/plain,application/sql"
                className="hidden"
                onChange={(event) => void onChange(event)}
            />
        </>
    );
}
