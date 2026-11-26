/*
 * Run mode: the plant running on the diagram, its controls, its log, the IDs shown while Alt is held.
 * - `RunMode` - a child of the diagram's `<Paper>` while running;
 * - `PlantLog` - inside `<Diagram>` while running (the log panel, open or closed);
 * - `TagBadges` - inside `<Diagram>` in both modes.
 */
export { RunMode } from './run-mode';
export { PlantLog, type PlantLogProps } from './plant-log';
export { TagBadges } from './tag-badges';
export { PlantControls } from './controls';
