/**
 * The diagram color palette: each color is a CSS variable, so the diagram
 * re-colors with the theme (see `css/variables.css`).
 */
export interface PaletteColor {
    label: string;
    value: string;
}

export const PALETTE: PaletteColor[] = [
    { label: 'Surface', value: 'var(--jj-palette-surface)' },
    { label: 'Ink', value: 'var(--jj-palette-ink)' },
    { label: 'Blue', value: 'var(--jj-palette-blue)' },
    { label: 'Soft Blue', value: 'var(--jj-palette-blue-soft)' },
    { label: 'Green', value: 'var(--jj-palette-green)' },
    { label: 'Soft Green', value: 'var(--jj-palette-green-soft)' },
    { label: 'Success', value: 'var(--jj-palette-success)' },
    { label: 'Danger', value: 'var(--jj-palette-danger)' },
    { label: 'Warning', value: 'var(--jj-palette-warning)' },
    { label: 'Accent', value: 'var(--jj-palette-accent)' }
];
