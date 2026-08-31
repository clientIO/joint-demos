/**
 * The colors TypeScript needs — cell records and `<Paper>` props cannot read
 * a CSS variable. `index.css` mirrors them for everything styled in CSS.
 */

/** The brand accent: selection halos, the tree's selected item, port of call. */
export const HIGHLIGHT_COLOR = '#08B081';

/** Stroke and text of the diagram content. */
export const INK_COLOR = '#1F2933';

/** Fill of the node cards. */
export const NODE_FILL_COLOR = '#ffffff';

/** The soft lift under every node card. */
export const NODE_SHADOW = 'drop-shadow(0 1px 2px rgb(31 41 51 / 18%))';

/** Link stroke — quieter than the accent so selection still reads. */
export const LINK_COLOR = '#7B8794';

/** The canvas ground. */
export const CANVAS_COLOR = '#F5F7F6';

/** The dot grid on the canvas ground. */
export const GRID_COLOR = '#D8DEDC';
