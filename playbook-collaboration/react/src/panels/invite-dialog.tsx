import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { SEAT_COUNT } from '@/model/palette';
import { inviteLink } from '@/state/identity';
import { SYNC_MODE } from '@/state/store';
import { buttonClass } from './ui';

/**
 * How to get colleagues onto the board: one link, copied with one click.
 * Whoever opens it lands on this board and takes the next free seat.
 */

const FIELD_CLASS =
  'min-w-0 flex-1 rounded-lg border border-control bg-paper px-2.5 py-2 font-mono text-[12px] text-ink focus:border-accent';

/** The link field and its copy button; unmounts with the dialog, so a
 * "copied" confirmation never outlives the visit it belongs to. */
function InviteLinkField({ link }: Readonly<{ link: string }>) {
    const [status, setStatus] = useState<'copied' | 'select' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const copy = async() => {
        try {
            await navigator.clipboard.writeText(link);
            setStatus('copied');
        } catch {
            // No clipboard permission: select the link and say what to do.
            inputRef.current?.select();
            setStatus('select');
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    id="jb-invite-link"
                    className={FIELD_CLASS}
                    aria-label="Invite link"
                    value={link}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" className={`${buttonClass('rush')} py-2`} onClick={copy}>
          Copy link
                </button>
            </div>
            <p className="m-0 min-h-4 text-[11px] font-semibold text-subtle" aria-live="polite">
                {status === 'copied' && 'Link copied. Paste it to your colleagues.'}
                {status === 'select' && 'The browser blocked the clipboard: the link is selected, copy it with Ctrl+C or ⌘C.'}
            </p>
        </>
    );
}

export function InviteDialog({
    open,
    boardId,
    boardName,
    onOpenChange,
}: Readonly<{
  open: boolean;
  boardId: string;
  boardName: string;
  onOpenChange: (open: boolean) => void;
}>) {
    const link = inviteLink(boardId, boardName);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[oklch(0.2_0.01_260/40%)] backdrop-blur-[2px]" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[14px] border border-edge bg-panel p-[22px] shadow-plate"
                    aria-describedby="jb-invite-copy"
                    // The link is what people came for: focused and selected on open, so
                    // Cmd+C works at once and Copy is one click away.
                    onOpenAutoFocus={(event: Event) => {
                        event.preventDefault();
                        const field = document.getElementById('jb-invite-link');
                        if (field instanceof HTMLInputElement) {
                            field.focus();
                            field.select();
                        }
                    }}
                >
                    <Dialog.Title className="m-0 text-[19px] font-extrabold tracking-[0.01em]">
            Invite your team
                    </Dialog.Title>
                    <Dialog.Description
                        id="jb-invite-copy"
                        className="m-0 text-[12.5px] leading-relaxed text-subtle"
                    >
                        {SYNC_MODE === 'liveblocks'
                            ? `Send this link. Whoever opens it lands on “${boardName}” and takes the next free department seat; the board holds up to ${SEAT_COUNT} people.`
                            : 'This is a local board: the link only works in this browser. Open it in a second tab to map together, or set VITE_LIVEBLOCKS_PUBLIC_KEY to invite people online.'}
                    </Dialog.Description>

                    <InviteLinkField link={link} />

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
