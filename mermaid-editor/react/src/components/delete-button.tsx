/**
 * The destructive control of a toolbar: a trash icon in the accent red.
 * Shared by the node and edge toolbars so both spell "delete" the same way.
 */

function TrashIcon() {
    return (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor"
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden
        >
            <path d="M2.5 4.5h11" />
            <path d="M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
            <path d="M4 4.5l.6 8.1a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.1" />
            <path d="M6.5 7.5v3.5M9.5 7.5v3.5" />
        </svg>
    );
}

export interface DeleteButtonProps {
    /** Accessible name — what gets deleted, e.g. "Delete node". */
    readonly label: string;
    readonly onClick: () => void;
}

export function DeleteButton({ label, onClick }: DeleteButtonProps) {
    return (
        <button
            type="button"
            className="node-toolbar-toggle is-danger"
            aria-label={label}
            title={`${label} (Delete)`}
            onClick={onClick}
        >
            <TrashIcon />
        </button>
    );
}
