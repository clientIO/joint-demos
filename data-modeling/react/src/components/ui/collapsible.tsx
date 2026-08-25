import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CollapsibleProps {
  readonly title: ReactNode;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
  /** Classes for the inner content wrapper (e.g. spacing applied when open). */
  readonly contentClassName?: string;
}

/** Chevron section animated via CSS `grid-template-rows` 0fr→1fr (no JS height measurement).
 *  Content stays mounted but is `inert` while collapsed (out of tab order + a11y tree). */
export function Collapsible({
    title,
    open,
    onToggle,
    children,
    contentClassName,
}: CollapsibleProps) {
    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full items-center gap-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
                <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
                {title}
            </button>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden" inert={!open}>
                    <div className={contentClassName}>{children}</div>
                </div>
            </div>
        </div>
    );
}
