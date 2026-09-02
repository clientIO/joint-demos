/**
 * The diagram color palette: each color is a CSS variable, so the diagram
 * re-colors with the theme (see `css/variables.css`).
 *
 * The variables are named for their role, while these labels name what the
 * swatch looks like — they are read by whoever is picking a colour, so they
 * are worth revisiting whenever the palette is repainted.
 */
export interface PaletteColor {
    label: string;
    value: string;
}

export const PALETTE: PaletteColor[] = [
    { label: 'Surface', value: 'var(--bpmn-palette-surface)' },
    { label: 'Ink', value: 'var(--bpmn-palette-ink)' },
    { label: 'Blue', value: 'var(--bpmn-palette-tint-a)' },
    { label: 'Soft Blue', value: 'var(--bpmn-palette-tint-a-soft)' },
    { label: 'Green', value: 'var(--bpmn-palette-tint-b)' },
    { label: 'Soft Green', value: 'var(--bpmn-palette-tint-b-soft)' },
    { label: 'Start', value: 'var(--bpmn-palette-start)' },
    { label: 'End', value: 'var(--bpmn-palette-end)' },
    { label: 'Decision', value: 'var(--bpmn-palette-decision)' },
    { label: 'Accent', value: 'var(--bpmn-palette-accent)' }
];
