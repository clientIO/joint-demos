import { mvc, ui } from '@joint/plus';
import { getFocusableTextFieldElements } from '../utils';

const THEME = 'mind-map';

let _dialog = null;

export function openDialog(app, options) {
    const { keyboard } = app;
    closeDialog(app);
    _dialog = new ui.Dialog(Object.assign({ width: 800, theme: THEME }, options));
    _dialog.open(app.el);
    _dialog.listenTo(keyboard, 'escape', () => closeDialog(app));
    // Stop the application controllers until the dialog is closed.
    app.stopControllers();
    _dialog.on('action:close', () => closeDialog(app));
    return _dialog;
}

export function closeDialog(app) {
    if (!_dialog)
        return;
    _dialog.close();
    _dialog = null;
    app.startControllers();
}

export function showHelpDialog(app) {
    
    const title = 'Mind Map Help';
    
    const content = /*html*/ `
    <h2>Keyboard shortcuts</h2>
    <table>
        <thead>
            <tr>
                <th>Keys</th>
                <th>Map editing</th>
                <th>Text editing</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><span class="key">up</span> / <span class="key">down</span></td>
                <td>Navigate to the previous / next sibling idea.</td>
            </tr>
            <tr>
                <td><span class="key">left</span> / <span class="key">right</span></td>
                <td>Navigate to a child / the parent idea.</td>
            </tr>
            <tr>
                <td><span class="key">↵ return</span></td>
                <td>Add a new idea after the selected idea.</td>
                <td>Stop and save the text editing.</td>
            </tr>
            <tr>
                <td><span class="key">⇧</span> + <span class="key">↵ return</span></td>
                <td>Add a new idea before the selected idea.</td>
                <td>Enter a new line.</td>
            </tr>
            <tr>
                <td><span class="key">⌃</span> + <span class="key">↵ return</span></td>
                <td>Add a new child idea.</td>
            </tr>
            <tr>
                <td><span class="key">⌃</span> + <span class="key">z</span></td>
                <td>Undo.</td>
            </tr>
            <tr>
                <td><span class="key">⇧</span> + <span class="key">⌃</span> + <span class="key">z</span></td>
                <td>Redo.</td>
            </tr>
            <tr>
                <td><span class="key">delete</span> / <span class="key">backspace</span></td>
                <td>Remove an idea.</td>
            </tr>
            <tr>
                <td><span class="key">printable key</span></td>
                <td>Rewrite an idea text.</td>
            </tr>
            <tr>
                <td><span class="key">space</span></td>
                <td>Add text to an idea.</td>
            </tr>
            <tr>
                <td><span class="key">escape</span></td>
                <td></td>
                <td>Cancel the text editing.</td>
            </tr>
            <tr>
                <td><span class="key">⌃</span> + <span class="pointer">click</span></td>
                <td>Opens a URL in a new tab.</td>
            </tr>
        </tbody>
    </table>
    `;
    
    openDialog(app, { title, content });
}

export function showURLDialog(app, ideaView, annotationUrl) {
    const { model: idea } = ideaView;
    const { label, annotations } = idea;
    const annotationIndex = annotations.findIndex(a8n => a8n.url === annotationUrl);
    const annotation = annotations[annotationIndex];
    const inspectorModel = new mvc.Model({
        text: label.slice(annotation.start, annotation.end),
        url: annotationUrl
    });
    // Define the dialog content.
    const inspector = new ui.Inspector({
        live: false,
        cell: inspectorModel,
        theme: THEME,
        inputs: {
            text: {
                label: 'Text to display',
                type: 'text'
            },
            url: {
                label: 'URL',
                type: 'text'
            }
        }
    });
    inspector.render();
    const submitEl = document.createElement('input');
    submitEl.type = 'submit';
    submitEl.hidden = true;
    const formEl = document.createElement('form');
    formEl.appendChild(inspector.el);
    formEl.appendChild(submitEl);
    // Open the dialog.
    const dialog = openDialog(app, {
        title: 'Edit URL',
        width: 250,
        content: formEl,
        buttons: [
            { content: 'Remove', action: 'remove' },
            { content: 'Change', action: 'save' }
        ]
    });
    // Focus the first input.
    const [textFieldEl] = getFocusableTextFieldElements(inspector.el);
    if (textFieldEl) {
        textFieldEl.focus();
        textFieldEl.select();
    }
    // Bind the event handlers
    formEl.onsubmit = () => saveURL();
    dialog.on({
        'action:save': () => saveURL(),
        'action:remove': () => removeURL()
    });
    // Functions
    function saveURL() {
        inspector.updateCell();
        const { url, text } = inspectorModel.attributes;
        idea.replaceAnnotationURL(annotationIndex, url, text, { addToHistory: true });
        closeDialog(app);
    }
    function removeURL() {
        const { text } = inspectorModel.attributes;
        idea.replaceAnnotationURL(annotationIndex, '', text, { addToHistory: true });
        closeDialog(app);
    }
}
