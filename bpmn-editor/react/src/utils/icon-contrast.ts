import type { dia } from '@joint/plus';

// The two colours a shape icon is drawn in. The dark one is the library's
// own default; the light one is for a dark shape body. They have to be
// literal colours: the icon is an `<image>` whose SVG bakes the fill into a
// data URI, where a CSS variable would never resolve.
const DARK_ICON = '#333333';
const LIGHT_ICON = '#F2F4F7';

// What a shape calls its body: a gateway, a data object and a pool paint
// `body`, while an activity and an event paint `background`.
const BODY_SELECTORS = ['body', 'background'];

// What carries a baked-in colour: the type icon, and the marker row an
// activity draws along its bottom edge.
const ICON_SELECTORS = ['icon', 'markers'];

// `iconColor` is the library's own knob, not a trick: an icon set entry
// (`Gateway.GATEWAY_ICONS`, `Activity.ACTIVITY_MARKER_ICONS`, ...) is a
// template, and the `icon-type` setter fills its `${color}` placeholders in
// with this attribute before encoding the result as a data URI.
//
// Which is the one thing to know when overriding an icon: a replacement
// carrying no `${color}` — a plain path, or a data URI with its fills
// written out — owns its colour for good. The attribute is then set to no
// effect, and the icon will not follow the theme.


/**
 * Paints a shape's icons so they stay readable against its own body.
 *
 * Reading the body rather than the theme is what keeps a shape carrying its
 * own fill — the amber gateways of the sample diagram — correct in both
 * themes. Returns whether anything changed.
 */
export function applyIconContrast(element: dia.Element, options?: dia.Cell.Options): boolean {

    const wanted = readable(bodyFill(element));
    if (!wanted) return false;

    let changed = false;

    ICON_SELECTORS.forEach((selector) => {
        if (!element.attr(selector)) return;
        if (element.attr([selector, 'iconColor']) === wanted) return;

        element.attr([selector, 'iconColor'], wanted, options);
        changed = true;
    });

    return changed;
}

// What the shape's body is painted with, whatever it calls it.
function bodyFill(element: dia.Element) {

    for (const selector of BODY_SELECTORS) {
        const fill = element.attr([selector, 'fill']);
        if (typeof fill === 'string' && fill !== 'none') return fill;
    }

    return null;
}

// Whichever candidate stands out against the body more. Returns `null` where
// the fill is not a colour at all — a gradient, `none`, a pattern — and the
// icon is left as it is.
function readable(fill: unknown): string | null {

    const body = toRGB(fill);
    if (!body) return null;

    return contrast(body, toRGB(LIGHT_ICON)!) > contrast(body, toRGB(DARK_ICON)!)
        ? LIGHT_ICON
        : DARK_ICON;
}

// Resolves what an SVG fill actually paints, `var(--token)` included, since
// that is how the shapes name their theme colours.
function toRGB(value: unknown): [number, number, number] | null {

    if (typeof value !== 'string') return null;

    const token = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1];
    const color = token
        ? getComputedStyle(document.documentElement).getPropertyValue(token).trim()
        : value.trim();

    const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
    if (hex) {
        const pairs = hex.length === 3
            ? [...hex].map((char) => char + char)
            : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
        return pairs.map((pair) => parseInt(pair, 16)) as [number, number, number];
    }

    const channels = color.match(/^rgba?\(([^)]+)\)$/)?.[1];
    if (!channels) return null;

    const parsed = channels.split(/[,\s/]+/).slice(0, 3).map(Number);

    return parsed.length === 3 && parsed.every(Number.isFinite)
        ? parsed as [number, number, number]
        : null;
}

// WCAG relative luminance and contrast ratio.
function luminance([r, g, b]: [number, number, number]) {
    const [red, green, blue] = [r, g, b].map((channel) => {
        const ratio = channel / 255;
        return ratio <= 0.03928 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(one: [number, number, number], two: [number, number, number]) {
    const first = luminance(one);
    const second = luminance(two);

    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
