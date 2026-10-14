import { ui } from '@joint/plus';
import { Mode } from '../const';
import { ZOOM } from '../canvas/config';
import { BELOW } from '../tooltips';
import { isPhone } from '../phone';

/*
 * The toolbar of the app in each mode: its tools, their groups (see `toolbar.css` for how they look).
 */

/** The label of the mode button says which mode it switches to. */
export const modeButtonText: Record<Mode, string> = {
    [Mode.Edit]: 'Run',
    [Mode.Runtime]: 'Edit'
};

/** What the mode button does (it switches to the other mode). */
const modeButtonTooltip: Record<Mode, string> = {
    [Mode.Edit]: 'Run the plant (the runtime mode)',
    [Mode.Runtime]: 'Back to editing the diagram'
};

/** The attributes of a button with its tooltip: below it */
const tooltip = (text: string) => ({ button: { 'data-tooltip': text, ...BELOW }});

/** The attributes of a button with an icon only: its name (for screen readers) and its tooltip below it */
const iconButton = (name: string, text: string) => ({ button: { 'aria-label': name, 'data-tooltip': text, ...BELOW }});

export function getToolbarOptions(mode: Mode): Partial<ui.Toolbar.Options> {
    // A new diagram is started, the diagram is saved (as JSON) and opened in the edit mode.
    const file: ui.Toolbar.Options['tools'] = mode === Mode.Edit ? [{
        type: 'button',
        name: 'new',
        group: 'file',
        attrs: iconButton('New diagram', 'A new diagram')
    }, {
        type: 'button',
        name: 'open',
        group: 'file',
        attrs: iconButton('Open', 'Open a diagram (JSON)')
    }, {
        type: 'button',
        name: 'save',
        group: 'file',
        attrs: iconButton('Save', 'Save the diagram (JSON)')
    }, {
        type: 'button',
        name: 'export',
        group: 'file',
        attrs: iconButton('Export image', 'Export the diagram as an image (WebP): the screen if there is one')
    }] : [];
    // The settings of the diagram (see `settings.ts`): edited in the edit mode
    const settings: ui.Toolbar.Options['tools'] = mode === Mode.Edit ? [{
        type: 'button',
        name: 'settings',
        group: 'settings',
        // Labeled: what is behind it is not obvious from the icon (the screen, the animations, the editor)
        text: 'Settings',
        attrs: tooltip('The settings of the diagram (the screen, the animations) and of the editor')
    }] : [];
    // The messages between the diagram and the plant (see `log/LogView.ts`): in the runtime mode
    const log: ui.Toolbar.Options['tools'] = mode === Mode.Runtime ? [{
        type: 'button',
        name: 'log',
        group: 'settings',
        text: 'Log',
        attrs: tooltip('The messages between the diagram and the plant: the updates, the commands')
    }] : [];
    // The side panels shown or hidden (see `App.setPanelShown()`): in the edit mode (none in the runtime mode)
    const panels: ui.Toolbar.Options['tools'] = mode === Mode.Edit ? [{
        type: 'button',
        name: 'palette',
        group: 'view',
        attrs: iconButton('Palette', 'Show / hide the palette (Ctrl+\\ both panels)')
    }, {
        type: 'button',
        name: 'inspector',
        group: 'view',
        attrs: iconButton('Inspector', 'Show / hide the inspector (Ctrl+\\ both panels)')
    }] : [];
    // The whole page full screen (see `toggleFullScreen()`), if the page may be (not in an iframe without
    // `allow="fullscreen"`, not on an iPhone). Not the built-in `fullscreen` tool: it reads `window.top.document`, which
    // throws in a cross-origin iframe (e.g. the demo embedded in another site).
    // TODO: the built-in tool once it uses the document of its target
    const fullscreen: ui.Toolbar.Options['tools'] = document.fullscreenEnabled ? [{
        type: 'button',
        name: 'fullscreen',
        group: 'view',
        attrs: iconButton('Full screen', 'Full screen')
    }] : [];
    // Find a shape (see `find/FindList.ts`): in both modes
    const find: ui.Toolbar.Options['tools'] = [{
        type: 'button',
        name: 'find',
        group: 'find',
        text: 'Find',
        attrs: tooltip('Find a shape by its tag, its label or its kind (Ctrl+F)')
    }];
    const history: ui.Toolbar.Options['tools'] = mode === Mode.Edit ? [{
        type: 'undo',
        name: 'undo',
        group: 'history',
        attrs: iconButton('Undo', 'Undo (Ctrl+Z)')
    }, {
        type: 'redo',
        name: 'redo',
        group: 'history',
        attrs: iconButton('Redo', 'Redo (Ctrl+Y)')
    }] : [];
    return {
        // Disable the undo / redo buttons when there's nothing to undo / redo (and the zoom ones at the limits).
        autoToggle: true,
        groups: {
            title: { index: 1 },
            file: { index: 2 },
            history: { index: 3 },
            zoom: { index: 4 },
            // The settings of the diagram: with the editing (on the left); the view of the app on the right
            settings: { index: 5 },
            // On the right: at the same place in both modes (the left differs), with the view (it changes nothing)
            find: { index: 6, align: ui.Toolbar.Align.Right },
            view: { index: 7, align: ui.Toolbar.Align.Right },
            mode: { index: 8, align: ui.Toolbar.Align.Right }
        },
        tools: [{
            type: 'label',
            name: 'title',
            text: 'SCADA Editor',
            group: 'title'
        },
        ...file,
        ...history,
        {
            type: 'zoomOut',
            name: 'zoomOut',
            group: 'zoom',
            min: ZOOM.min,
            attrs: iconButton('Zoom out', 'Zoom out')
        }, {
            type: 'zoomIn',
            name: 'zoomIn',
            group: 'zoom',
            max: ZOOM.max,
            attrs: iconButton('Zoom in', 'Zoom in')
        }, {
            // Not the `zoomToFit` tool (it rounds the zoom): the same fit as on loading (see `zoomToFit()`)
            type: 'button',
            name: 'zoomToFit',
            group: 'zoom',
            attrs: iconButton('Zoom to fit', 'Zoom to fit the diagram')
        },
        ...settings,
        ...log,
        ...find,
        ...panels,
        ...fullscreen,
        {
            type: 'button',
            name: 'colorScheme',
            group: 'view',
            attrs: iconButton('Light / dark', 'Light / dark')
        }, {
            type: 'button',
            name: 'mode',
            group: 'mode',
            // On a phone: back to the examples (see `phone.ts`)
            ...(isPhone() && mode === Mode.Runtime
                ? { text: 'Exit', attrs: tooltip('Back to the examples') }
                : { text: modeButtonText[mode], attrs: tooltip(modeButtonTooltip[mode]) })
        }]
    };
}
