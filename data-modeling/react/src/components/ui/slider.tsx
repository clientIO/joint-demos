import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/utils/cn';
import { IS_APPLE_WEBKIT } from '@/utils/platform';

function Slider({
    className,
    defaultValue,
    value,
    min = 0,
    max = 100,
    // Radix puts role="slider" on the Thumb, so the accessible name + valuetext
    // belong there (not the Root); forwarded to each thumb below.
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-valuetext': ariaValuetext,
    ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
    const values = Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
            ? defaultValue
            : [min, max];

    // Radix positions the track/thumb with absolute + transform, which WebKit
    // can't paint inside a <foreignObject>. Fall back to a native range input
    // (single form control, paints fine) with the same single-value API.
    if (IS_APPLE_WEBKIT) {
        return (
            <input
                type="range"
                min={min}
                max={max}
                step={props.step}
                value={values[0] ?? min}
                disabled={props.disabled}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby}
                aria-valuetext={ariaValuetext}
                onChange={(event) => props.onValueChange?.([Number(event.target.value)])}
                className={cn(
                    'h-4 w-full cursor-pointer accent-primary disabled:opacity-50',
                    className,
                )}
            />
        );
    }

    return (
        <SliderPrimitive.Root
            data-slot="slider"
            defaultValue={defaultValue}
            value={value}
            min={min}
            max={max}
            className={cn(
                'relative flex w-full touch-none select-none items-center',
                'data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
                'data-[disabled]:opacity-50',
                className,
            )}
            {...props}
        >
            <SliderPrimitive.Track
                data-slot="slider-track"
                className={cn(
                    'relative grow overflow-hidden rounded-full bg-muted',
                    'data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full',
                    'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1',
                )}
            >
                <SliderPrimitive.Range
                    data-slot="slider-range"
                    className={cn(
                        // Fill color (diluted at rest, primary on hover) lives in index.css.
                        'absolute',
                        'data-[orientation=horizontal]:h-full',
                        'data-[orientation=vertical]:w-full',
                    )}
                />
            </SliderPrimitive.Track>
            {values.map((_, index) => (
                <SliderPrimitive.Thumb
                    data-slot="slider-thumb"
                    key={`slider-thumb-${index}`}
                    aria-label={ariaLabel}
                    aria-labelledby={ariaLabelledby}
                    aria-valuetext={ariaValuetext}
                    className={cn(
                        // bg-card knob; border color + halo live in index.css, keyed off data-slot.
                        'block size-4 shrink-0 rounded-full border-2 bg-card',
                        'disabled:pointer-events-none disabled:opacity-50',
                    )}
                />
            ))}
        </SliderPrimitive.Root>
    );
}

export { Slider };
