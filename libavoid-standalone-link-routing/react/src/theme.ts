/**
 * The few palette values that have to exist in TypeScript.
 *
 * Links and ports are SVG cells whose colours are baked into the cell records
 * (`cells.ts`), and the paper background is a `<Paper>` prop — none of those
 * can read a CSS variable. Everything else, the whole node card included, is
 * HTML and styled in `index.css`; the values below are mirrored there as
 * `--main-color` and friends.
 */
export const MAIN_COLOR = '#4D64DD';
export const DARK_COLOR = '#322A49';
export const LIGHT_COLOR = '#FFFFFF';
export const CANVAS_COLOR = '#F3F7F6';
