import { dia, mvc, ui } from '@joint/plus';
import type { App } from '../app';
import { clearSelection, selectCell } from '../actions';
import { addScreen, getScreen } from '../canvas/screen';
import Screen from '../shapes/models/diagram/Screen';
import { renderLabel } from './help';
import { ANIMATIONS_ATTRIBUTE, type AnimationLevel, getAnimationLevel } from '../runtime/animations';
import { type DiagramStyle, getStyle, LABEL_SIZES, STYLE_ATTRIBUTE } from '../diagram-style';
import { CANVAS_COLORS, getColorFieldValue, isColorField, renderColorField } from './color-field';
import { OUTLINE_WIDTHS } from '../shapes/common/gradients';
import { closePanel, type PanelContent, showInPanel } from './panel';
import { storePreference } from '../preferences';
import { keysOf } from '../keys';

/*
 * The settings of the diagram (the cog in the toolbar), in the inspector panel: whether the diagram has
 * a screen (see `screen.ts`) and its size, the animations of the run mode; the preferences of the editor (the
 * snaplines, the In Use group of the palette, moving the selected shapes only).
 * While they are open, the screen can be
 * moved (and selected, resized); it is out of the way otherwise.
 */

/** The settings in the inspector panel (see `openSettings()`): the screen editable while they are open */
class SettingsPanel implements PanelContent {

    el: HTMLElement;
    protected app: App;
    protected inspector: ui.Inspector;
    protected listener: mvc.Listener<[]>;

    constructor(app: App, el: HTMLElement, inspector: ui.Inspector, listener: mvc.Listener<[]>) {
        this.app = app;
        this.el = el;
        this.inspector = inspector;
        this.listener = listener;
        app.paper.el.classList.add('scada-screen-editable');
        app.toolbar.getWidgetByName('settings')?.el.classList.add('active');
    }

    remove(): void {
        const { app } = this;
        this.listener.stopListening();
        this.inspector.remove();
        this.el.remove();
        app.paper.el.classList.remove('scada-screen-editable');
        app.toolbar.getWidgetByName('settings')?.el.classList.remove('active');
    }
}

interface ScreenSettings {
    screen: boolean;
    size?: dia.Size;
}

/** The settings of the editor (not saved with the diagram) */
interface EditorSettings {
    snaplines: boolean;
    inUse: boolean;
    moveSelectedOnly: boolean;
}

/** A change of the settings following the diagram (not changing it back) */
type SettingsOptions = dia.Cell.Options & { diagram?: boolean };
const FROM_DIAGRAM: SettingsOptions = { diagram: true };

/** The settings of the screen of the diagram: whether it has one, and its size */
function getScreenSettings(graph: dia.Graph): ScreenSettings {
    const screen = getScreen(graph);
    return screen ? { screen: true, size: screen.size() } : { screen: false };
}

export function isSettingsOpen(app: App): boolean {
    return app.panel instanceof SettingsPanel;
}

/**
 * The cog of the toolbar: open the settings (instead of the selection) or close them.
 * The screen is selected with them (it is edited in the settings, see `SelectionController`).
 */
export function toggleSettings(app: App): void {
    if (isSettingsOpen(app)) {
        clearSelection(app);
        closeSettings(app);
        return;
    }
    const screen = getScreen(app.graph);
    if (screen) {
        selectCell(app, screen);
    } else {
        clearSelection(app);
        openSettings(app);
    }
}

/**
 * The settings are a model of their own, edited in the inspector: it changes the diagram (adds, removes
 * or resizes the screen) and follows it (the screen resized with the free transform, an undo, ...).
 */
export function openSettings(app: App): void {
    if (isSettingsOpen(app)) {
        return;
    }
    const { graph } = app;
    const el = document.createElement('div');
    el.className = 'scada-settings';
    const titleEl = document.createElement('h3');
    titleEl.className = 'scada-settings-title';
    titleEl.textContent = 'Settings';
    el.append(titleEl);

    // A cell (not in the graph): the inspector unsets its properties (`removeProp()`)
    const editorSettings: EditorSettings = {
        snaplines: app.snaplinesEnabled,
        inUse: app.inUseShown,
        moveSelectedOnly: app.moveSelectedOnly
    };
    const settings = new dia.Cell({
        ...getScreenSettings(graph),
        animations: getAnimationLevel(graph),
        style: getStyle(graph),
        ...editorSettings
    });
    const listener = new mvc.Listener<[]>();
    // The settings change the diagram (the settings of the diagram are its cells)...
    listener.listenTo(settings, 'change:screen', (_cell: dia.Cell, enabled: boolean, options: SettingsOptions) => {
        if (options.diagram) {
            return;
        }
        if (enabled) {
            addScreen(app);
        } else {
            getScreen(graph)?.remove();
        }
    });
    listener.listenTo(settings, 'change:size', (_cell: dia.Cell, size: dia.Size | undefined, options: SettingsOptions) => {
        if (!options.diagram && size) {
            getScreen(graph)?.resize(size.width, size.height);
        }
    });
    listener.listenTo(settings, 'change:style', (_cell: dia.Cell, style: DiagramStyle, options: SettingsOptions) => {
        if (!options.diagram) {
            graph.set(STYLE_ATTRIBUTE, { ...style });
        }
    });
    listener.listenTo(graph, `change:${STYLE_ATTRIBUTE}`, () => settings.set({ style: getStyle(graph) }, FROM_DIAGRAM));
    listener.listenTo(settings, 'change:animations', (_cell: dia.Cell, level: AnimationLevel, options: SettingsOptions) => {
        if (!options.diagram) {
            graph.set(ANIMATIONS_ATTRIBUTE, level);
        }
    });
    // The settings of the editor: remembered in this browser (see `preferences.ts`)
    listener.listenTo(settings, 'change:snaplines', (_cell: dia.Cell, enabled: boolean) => {
        app.setSnaplinesEnabled(enabled);
        storePreference('snaplines', enabled);
    });
    listener.listenTo(settings, 'change:inUse', (_cell: dia.Cell, shown: boolean) => {
        app.setInUseShown(shown);
        storePreference('inUse', shown);
    });
    listener.listenTo(settings, 'change:moveSelectedOnly', (_cell: dia.Cell, selectedOnly: boolean) => {
        app.setMoveSelectedOnly(selectedOnly);
        storePreference('moveSelectedOnly', selectedOnly);
    });
    // ... and follow it.
    listener.listenTo(graph, 'add remove reset change:size', () => {
        const { screen, size } = getScreenSettings(graph);
        settings.set({ screen }, FROM_DIAGRAM);
        if (size) {
            settings.set({ size }, FROM_DIAGRAM);
        }
    });
    listener.listenTo(graph, 'change:animations', () => settings.set({ animations: getAnimationLevel(graph) }, FROM_DIAGRAM));
    // The screen back (an undo of its removal): selected, as when the settings are opened
    listener.listenTo(graph, 'add', (cell: unknown) => {
        if (Screen.isScreen(cell)) {
            selectCell(app, cell);
        }
    });

    // The size of the screen if there is one (no size without it)
    const withScreen = { eq: { screen: true }, otherwise: { unset: true }};
    const inspector = new ui.Inspector({
        cell: settings,
        inputs: {
            screen: { type: 'toggle', label: 'Enabled', group: 'screen', index: 1 },
            size: {
                width: { type: 'number', label: 'Width', min: 100, group: 'screen', index: 2, when: withScreen },
                height: { type: 'number', label: 'Height', min: 100, group: 'screen', index: 3, when: withScreen }
            },
            // The style of the diagram (see `diagram-style.ts`): none of a color - the defaults of the shapes (Auto)
            style: {
                finish: {
                    type: 'select-button-group',
                    label: 'Finish',
                    options: [
                        { value: 'shaded', content: 'Shaded' },
                        { value: 'flat', content: 'Flat' }
                    ],
                    defaultValue: 'shaded',
                    group: 'style',
                    index: 0
                },
                color: { type: 'color', label: 'Color', auto: true, graph, group: 'style', index: 1, help: 'diagram-style' },
                outline: { type: 'color', label: 'Outline', auto: true, graph, group: 'style', index: 2 },
                // Of the shapes outlined (an outline color, flat), of the borders of the pipes
                outlineWidth: {
                    type: 'select-button-group',
                    label: 'Outline width',
                    options: keysOf(OUTLINE_WIDTHS).map(value => ({ value, content: OUTLINE_WIDTHS[value].name })),
                    defaultValue: 'normal',
                    group: 'style',
                    index: 2.5
                },
                accent: { type: 'color', label: 'Accent', auto: true, graph, group: 'style', index: 3 },
                // What the labels of the shapes show (see `LabelContent`)
                labels: {
                    type: 'select-button-group',
                    label: 'Labels',
                    help: 'labels',
                    options: [
                        { value: 'name', content: 'Name' },
                        { value: 'tag', content: 'ID' },
                        { value: 'both', content: 'ID + name' }
                    ],
                    defaultValue: 'name',
                    group: 'style',
                    index: 3.5
                },
                // The labels of the elements: a size, a color of the theme (a text readable in both schemes)
                labelSize: {
                    type: 'select-button-group',
                    label: 'Label size',
                    options: Object.entries(LABEL_SIZES).map(([value, { name }]) => ({ value, content: name })),
                    defaultValue: 'medium',
                    group: 'style',
                    index: 4
                },
                labelColor: { type: 'color', label: 'Label color', auto: true, themeOnly: true, graph, group: 'style', index: 5 },
                // The background: of the colors of the canvas (a light and a dark tone), its grid follows
                canvas: { type: 'color', label: 'Canvas', auto: true, themeOnly: true, palette: CANVAS_COLORS, graph, group: 'style', index: 6 },
                canvasGradient: { type: 'toggle', label: 'Canvas gradient', group: 'style', index: 7 }
            },
            // What moves in the run mode (see `AnimationLevel`)
            animations: {
                type: 'select-button-group',
                label: 'Animations',
                options: [
                    { value: 'full', content: 'Full' },
                    { value: 'alarms', content: 'Alarms only' }
                ],
                group: 'runtime',
                index: 1
            },
            // A moved or resized element aligns with the others
            snaplines: { type: 'toggle', label: 'Snaplines', group: 'editor', index: 1 },
            // The group of the palette with the shapes of the diagram
            inUse: { type: 'toggle', label: 'In Use group', group: 'editor', index: 2 },
            // A drag on a shape not selected pans the canvas (see `EditController`)
            moveSelectedOnly: { type: 'toggle', label: 'Move selected shapes only', group: 'editor', index: 3 }
        },
        groups: {
            screen: { label: 'Screen', index: 1 },
            style: { label: 'Style', index: 2 },
            runtime: { label: 'Run mode', index: 3 },
            editor: { label: 'Editor', index: 4 }
        },
        // The help of the screen (see `help.ts`)
        renderLabel,
        // The color fields of the style (see `color-field.ts`)
        renderFieldContent: renderColorField,
        getFieldValue: attribute => (isColorField(attribute) ? getColorFieldValue(attribute) : undefined)
    });
    inspector.render();
    renderDisplaySizeButton(app, inspector);
    el.append(inspector.el);
    showInPanel(app, new SettingsPanel(app, el, inspector, listener));
}

/**
 * A button under the size of the screen: the size of the display the editor is on (the run mode in the full screen
 * shows the screen on it - fitted, so its proportions are what matter), with a screen only.
 */
function renderDisplaySizeButton(app: App, inspector: ui.Inspector): void {
    const heightField = inspector.el.querySelector('[data-field="size/height"]');
    if (!heightField) {
        return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scada-display-size-button';
    button.textContent = 'Fit to display';
    // The size it sets: of the display when the settings were opened. The window moved to another display
    // since, it shows the old size - the click reads the current one (and shows it).
    const sizeEl = document.createElement('span');
    const showSize = () => {
        sizeEl.textContent = `${window.screen.width} × ${window.screen.height}`;
    };
    showSize();
    button.append(sizeEl);
    button.addEventListener('click', () => {
        showSize();
        getScreen(app.graph)?.resize(window.screen.width, window.screen.height);
    });
    // In a field of the inspector: its padding; hidden with the height (see `inspector.css`)
    const field = document.createElement('div');
    field.className = 'field scada-display-size-field';
    field.append(button);
    heightField.after(field);
}

export function closeSettings(app: App): void {
    if (isSettingsOpen(app)) {
        closePanel(app);
    }
}
