/**
 * The Invite dialog: the board's link, selected and ready to copy. Whoever opens
 * the link joins this board's Liveblocks room.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { buttonClass } from './button-class';

const LINK_FIELD_ID = 'pb-invite-link';
const DESCRIPTION_ID = 'pb-invite-description';

/** The link field and its Copy button; the "copied" note resets each time the dialog opens. */
function InviteLinkField({ link }: Readonly<{ link: string }>) {
    const [status, setStatus] = useState<'copied' | 'blocked' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const copy = async() => {
        try {
            await navigator.clipboard.writeText(link);
            setStatus('copied');
        } catch {
            // No clipboard permission: select the link and say how to copy it.
            inputRef.current?.select();
            setStatus('blocked');
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    id={LINK_FIELD_ID}
                    className="min-w-0 flex-1 rounded-lg border border-control bg-paper px-2.5 py-2 font-mono text-[12px] text-ink focus:border-accent"
                    aria-label="Invite link"
                    value={link}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" className={`${buttonClass('primary')} py-2`} onClick={copy}>
                    Copy link
                </button>
            </div>
            <p className="m-0 min-h-4 text-[11px] font-semibold text-subtle" aria-live="polite">
                {status === 'copied' && 'Link copied. Paste it to your colleagues.'}
                {status === 'blocked' && 'The browser blocked the clipboard: the link is selected, copy it with Ctrl+C or Cmd+C.'}
            </p>
        </>
    );
}

/** The dialog itself, controlled by the Invite button. */
export function InviteDialog({ open, onOpenChange }: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[oklch(0.2_0.01_260/40%)] backdrop-blur-[2px]" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[14px] border border-edge bg-panel p-[22px] shadow-plate"
                    aria-describedby={DESCRIPTION_ID}
                    // The link is what people came for: focus and select it, so Cmd+C works at once.
                    onOpenAutoFocus={(event: Event) => {
                        event.preventDefault();
                        const field = document.getElementById(LINK_FIELD_ID);
                        if (field instanceof HTMLInputElement) field.select();
                    }}
                >
                    <Dialog.Title className="m-0 text-[19px] font-extrabold tracking-[0.01em]">Invite your team</Dialog.Title>
                    <Dialog.Description id={DESCRIPTION_ID} className="m-0 text-[12.5px] leading-relaxed text-subtle">
                        Send this link. Whoever opens it joins this board, picks a department and edits along with you.
                    </Dialog.Description>
                    <InviteLinkField link={window.location.href} />
                    <Dialog.Close asChild>
                        <button type="button" className={`${buttonClass()} self-end px-3 py-1.5 text-xs`}>
                            Done
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
