/** The product mark: Lucide's `user-round-group`, the team the playbook is for. */
export function PlaybookMark({ size }: Readonly<{ size: number }>) {
    return (
        <svg
            className="flex-none text-accent"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M17 21a5 5 0 0 0-10 0" />
            <path d="M22 10.5a3.5 3.5 0 0 0-5.507-2.868" />
            <path d="M7.507 7.632A3.5 3.5 0 0 0 2 10.5" />
            <circle cx={12} cy={13} r={3} />
            <circle cx={18.5} cy={4.5} r={2.5} />
            <circle cx={5.5} cy={4.5} r={2.5} />
        </svg>
    );
}
