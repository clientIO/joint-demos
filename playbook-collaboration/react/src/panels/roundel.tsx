/**
 * A person's avatar: their initial on their department color. With a `title` it
 * becomes a focusable button with a tooltip, so the full name reaches keyboard
 * and screen-reader users too.
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { seatColor } from '@/model';

/** One avatar. */
export function Roundel({
    seat,
    label,
    title,
    isBig,
    className,
}: Readonly<{ seat: number; label: string; title?: string; isBig?: boolean; className?: string }>) {
    const roundelClass = clsx(
        'inline-flex items-center justify-center rounded-full border-2 border-panel font-semibold',
        isBig ? 'size-11 border-edge text-[19px]' : 'size-9 text-[13px]',
        className
    );
    const style = { background: seatColor(seat), color: 'var(--seat-ink)' };
    const initial = label.slice(0, 1).toUpperCase();
    // A lone letter means nothing to a screen reader; an untitled roundel sits next to its caption.
    if (title === undefined) {
        return (
            <span className={roundelClass} style={style} aria-hidden>
                {initial}
            </span>
        );
    }
    return (
        <Tooltip.Root delayDuration={150}>
            <Tooltip.Trigger asChild>
                <button type="button" className={clsx(roundelClass, 'cursor-default p-0')} style={style} aria-label={title}>
                    {initial}
                </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    side="bottom"
                    sideOffset={6}
                    className="z-30 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink shadow-plate"
                >
                    {title}
                    <Tooltip.Arrow className="fill-panel" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}
