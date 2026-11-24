/**
 * Shown instead of the board when no Liveblocks public key is configured: the
 * board's whole point is to be shared, so it says how to get a free key.
 */

/** Setup instructions for `VITE_LIVEBLOCKS_PUBLIC_KEY`; `hasWrongKind` when a non-public key was set. */
export function MissingKeyNotice({ hasWrongKind }: Readonly<{ hasWrongKind: boolean }>) {
    return (
        <div className="flex flex-1 items-start justify-center overflow-y-auto bg-paper pt-[12vh]">
            <section className="flex w-[min(520px,calc(100vw-32px))] flex-col gap-3 rounded-xl border border-edge bg-panel p-5 shadow-plate">
                <h2 className="m-0 text-[17px] font-extrabold">Add a Liveblocks key to start a board</h2>
                {hasWrongKind && (
                    <p className="m-0 rounded-lg border border-accent px-3 py-2 text-[13px] font-semibold" role="alert">
                        The configured key is not a public key (it must start with <code className="font-mono">pk_</code>), so it
                        was not used. Never put a secret key in a browser app.
                    </p>
                )}
                <p className="m-0 text-[13px] leading-relaxed text-subtle">
                    Playbook keeps the board in a Liveblocks room, so everyone who opens the same link edits the same
                    board. Liveblocks has a free plan; you only need its public key.
                </p>
                <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] leading-relaxed">
                    <li>
                        Sign in at <a className="text-accent" href="https://liveblocks.io" target="_blank" rel="noreferrer">liveblocks.io</a> and
                        open a project.
                    </li>
                    <li>
                        Copy the <strong>public</strong> key (<code className="font-mono">pk_...</code>) from <em>API keys</em>.
                        Never use the secret key in a browser app.
                    </li>
                    <li>
                        Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code>,
                        set <code className="font-mono">VITE_LIVEBLOCKS_PUBLIC_KEY</code>, and restart <code className="font-mono">npm run dev</code>.
                    </li>
                </ol>
            </section>
        </div>
    );
}
