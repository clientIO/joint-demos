/** Ghost icon button + tooltip — the toolbar's workhorse. Pass `expanded` to
 *  reflect an expandable surface's state via `aria-expanded`. */
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface IconButtonProps {
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  /** When set, marks the button as controlling an expandable surface. */
  readonly expanded?: boolean;
  readonly className?: string;
}

export function IconButton({
    label,
    icon: Icon,
    onClick,
    disabled,
    expanded,
    className,
}: IconButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    aria-expanded={expanded}
                    onClick={onClick}
                    disabled={disabled}
                    className={className}
                >
                    <Icon className="size-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
