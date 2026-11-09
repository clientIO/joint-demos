/** The id of the diagram's paper: hooks outside the paper's subtree name it. */
export const PAPER_ID = 'plant';

/** How the whole diagram is fitted into the view: a margin, never enlarged past 100%. */
export const FIT_OPTIONS = { padding: 48, maxScale: 1 };

/** The factor a zoom button scales the view by. */
export const ZOOM_STEP = 1.2;

/** Selects the zoom of the view, as a whole percentage. */
export const selectZoom = (viewport: { readonly zoom: number }): number => Math.round(viewport.zoom * 100);
