// The one-click "apply" of a rule-check finding, shared by the inspector's
// suggestions and the outputs report so a finding is fixable wherever it
// is read.

import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncer } from '@/components/ui/announcer-context';
import type { Finding } from '@/model/validation';
import { useDesignerStore } from '@/state/designer-store';

export function FindingFixButton({ finding }: { readonly finding: Finding }) {
    const applyFix = useDesignerStore((state) => state.applyFix);
    const announce = useAnnouncer();
    if (finding.fix === undefined) return null;
    return (
        <Button
            size="sm"
            variant="primary"
            title={finding.fix.description}
            // Fix labels are data and can wrap to two lines — let the button
            // GROW (the shared h-8 would cram wrapped text into the chamfer).
            className="h-auto min-h-8 flex-1 py-1.5 leading-snug"
            onClick={() => {
                const applied = applyFix(finding.id);
                // Past tense — this reports a COMPLETED action, not the fix
                // button's present-tense description.
                if (applied !== undefined) announce(`Applied: ${applied.title.toLowerCase()}`);
            }}
        >
            <Wrench className="size-3" aria-hidden /> {finding.fix.label}
        </Button>
    );
}
