import type { ReactNode } from 'react';

/** The icon at the left end of a pill: the kind of the node, drawn the way the diagram draws it. */
export function KindIcon({ d }: { d: string }): ReactNode {
    return (
        <svg className="kind-icon" viewBox="-10 -10 20 20" width="20" height="20" aria-hidden="true">
            <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
