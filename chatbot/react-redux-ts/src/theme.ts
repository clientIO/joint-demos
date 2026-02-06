/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

export const MAX_PORT_COUNT = 3;
export const FONT_FAMILY = 'realist, Helvetica, Arial, sans-serif';
export const OUT_PORT_HEIGHT = 28;
export const OUT_PORT_WIDTH = 96;
export const OUT_PORT_LABEL = 'out';
export const PORT_BORDER_RADIUS = 16;
export const GRID_SIZE = 8;
export const PADDING_S = GRID_SIZE;
export const PADDING_L = GRID_SIZE * 2;
export const ADD_PORT_SIZE = 20;
export const REMOVE_PORT_SIZE = 16;
export const BACKGROUND_COLOR = '#F9F9F9';
export const SECONDARY_BACKGROUND_COLOR = '#FCFCFC';
export const LIGHT_COLOR = '#FFFFFF';
export const DARK_COLOR = '#212121';
export const MAIN_COLOR = '#0057FF';
export const LINE_WIDTH = 2;
export const STENCIL_WIDTH = 200;
export const ZOOM_MAX = 3;
export const ZOOM_MIN = 0.4;
export const ZOOM_STEP = 0.2;

// icons
export const MESSAGE_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiPjxwYXRoIGQ9Ik0yMCAySDRjLTEuMSAwLTEuOTkuOS0xLjk5IDJMMiAyMmw0LTRoMTRjMS4xIDAgMi0uOSAyLTJWNGMwLTEuMS0uOS0yLTItMnptLTIgMTJINnYtMmgxMnYyem0wLTNINlY5aDEydjJ6bTAtM0g2VjZoMTJ2MnoiLz48cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+PC9zdmc+';
export const USER_INPUT_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMjEgMy4wMUgzYy0xLjEgMC0yIC45LTIgMlY5aDJWNC45OWgxOHYxNC4wM0gzVjE1SDF2NC4wMWMwIDEuMS45IDEuOTggMiAxLjk4aDE4YzEuMSAwIDItLjg4IDItMS45OHYtMTRjMC0xLjExLS45LTItMi0yek0xMSAxNmw0LTQtNC00djNIMXYyaDEwdjN6Ii8+PC9zdmc+';
export const CONFIRMATION_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNOSAxNi4yTDQuOCAxMmwtMS40IDEuNEw5IDE5IDIxIDdsLTEuNC0xLjRMOSAxNi4yeiIvPjwvc3ZnPg==';
export const ENTITY_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9ImJsYWNrIiB3aWR0aD0iMThweCIgaGVpZ2h0PSIxOHB4Ij48Zz48cmVjdCBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiLz48L2c+PGc+PGcvPjxnPjxwYXRoIGQ9Ik04LDhINnY3YzAsMS4xLDAuOSwyLDIsMmg5di0ySDhWOHoiLz48cGF0aCBkPSJNMjAsM2gtOGMtMS4xLDAtMiwwLjktMiwydjZjMCwxLjEsMC45LDIsMiwyaDhjMS4xLDAsMi0wLjksMi0yVjVDMjIsMy45LDIxLjEsMywyMCwzeiBNMjAsMTFoLThWN2g4VjExeiIvPjxwYXRoIGQ9Ik00LDEySDJ2N2MwLDEuMSwwLjksMiwyLDJoOXYtMkg0VjEyeiIvPjwvZz48L2c+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIi8+PGcgZGlzcGxheT0iaW5saW5lIj48cGF0aCBkPSJNOCw4SDZ2N2MwLDEuMSwwLjksMiwyLDJoOXYtMkg4Vjh6Ii8+PHBhdGggZD0iTTIwLDNoLThjLTEuMSwwLTIsMC45LTIsMnY2YzAsMS4xLDAuOSwyLDIsMmg4YzEuMSwwLDItMC45LDItMlY1QzIyLDMuOSwyMS4xLDMsMjAsM3ogTTIwLDExaC04VjdoOFYxMXoiLz48cGF0aCBkPSJNNCwxMkgydjdjMCwxLjEsMC45LDIsMiwyaDl2LTJINFYxMnoiLz48L2c+PC9nPjwvc3ZnPg==';
