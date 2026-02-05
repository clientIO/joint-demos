import { util } from '@joint/plus';
import Showdown from 'showdown';
import Node from './Node';
import { Attribute } from '../const';
import Theme from '../theme';

const noteMarkup = util.svg /* xml*/ `
    <rect @selector="body" class="note-body"/>
    <foreignObject @selector="content" class="note-text"/>
`;

const TYPE = 'note';

/** A sticky note element for adding annotations to the diagram. */
export default class Note extends Node {
    
    static type = TYPE;
    
    static growthLimit = 0;
    
    minimapBackground = Theme.NoteMinimapBackgroundColor;
    
    preinitialize() {
        this.markup = noteMarkup;
    }
    
    defaults() {
        return {
            ...super.defaults(),
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            [Attribute.ContextMenu]: {
                x: `calc(w - ${Theme.NodeToolSize + 1})`,
                y: 1
            },
            // Shape-specific attributes
            [Attribute.Markdown]: '',
            // JointJS attributes
            z: -1,
            type: TYPE,
            size: { width: 200, height: 80 },
            attrs: {
                root: {
                    cursor: 'move',
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: Theme.NoteBackgroundColor,
                    stroke: Theme.NoteBorderColor,
                    strokeWidth: 1,
                    rx: 8,
                    ry: 8
                },
                content: {
                    x: Theme.NotePadding,
                    y: Theme.NotePadding,
                    width: `calc(w - ${Theme.NotePadding * 2})`,
                    height: `calc(h - ${Theme.NotePadding * 2})`,
                    fontSize: 14,
                    fontFamily: Theme.FontFamily,
                    fontWeight: 'normal',
                    style: { color: Theme.NoteTextColor },
                }
            }
        };
    }
    
    /**
     * @returns The markdown content of the note from the note model.
     * @see {@link Attribute.Markdown}
     */
    getMarkdown() {
        return this.get(Attribute.Markdown) || '';
    }
    
    /**
     * Sets the markdown content for the note.
     * @param markdown - The markdown content to set.
     * @param options - The options to pass to the set method.
     * @see {@link Attribute.Markdown}
     */
    setMarkdown(markdown, options) {
        this.set(Attribute.Markdown, markdown, options);
    }
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        this.updateContent();
        this.on(`change:${Attribute.Markdown}`, () => this.updateContent());
    }
    
    /**
     * Updates the content of the note based on the markdown attribute.
     * Converts the markdown content to HTML using Showdown package.
     * @see {@link Attribute.Markdown}
     * @see {@link getMarkdown}
     */
    updateContent() {
        const converter = new Showdown.Converter();
        const html = converter.makeHtml(this.getMarkdown());
        this.attr('content/html', html);
    }
    
    /**
     * @returns Inspector config for the note.
     * @see {@link InspectorConfig}
     */
    getInspectorConfig() {
        return {
            ...super.getInspectorConfig(),
            headerText: 'Notes',
            headerIcon: 'assets/icons/note.svg',
            headerHint: 'Add notes for context and collaboration',
        };
    }
    
    getOutlinePathData(options) {
        return super.getOutlinePathData({ radius: 8, ...options });
    }
}
