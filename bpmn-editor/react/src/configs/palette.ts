/**
 * The diagram color palette: each color is a CSS variable, so the diagram
 * re-colors with the theme (see `css/variables.css`).
 */
export interface PaletteColor {
    label: string;
    value: string;
}

export const PALETTE: PaletteColor[] = [
    { label: 'Surface', value: 'var(--bpmn-palette-surface)' },
    { label: 'Ink', value: 'var(--bpmn-palette-ink)' },
    { label: 'Blue', value: 'var(--bpmn-palette-blue)' },
    { label: 'Soft Blue', value: 'var(--bpmn-palette-blue-soft)' },
    { label: 'Green', value: 'var(--bpmn-palette-green)' },
    { label: 'Soft Green', value: 'var(--bpmn-palette-green-soft)' },
    { label: 'Success', value: 'var(--bpmn-palette-success)' },
    { label: 'Danger', value: 'var(--bpmn-palette-danger)' },
    { label: 'Warning', value: 'var(--bpmn-palette-warning)' },
    { label: 'Accent', value: 'var(--bpmn-palette-accent)' }
];
