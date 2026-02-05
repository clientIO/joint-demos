import { util } from '@joint/plus';
import Showdown from 'showdown';
import Node from './Node';
import Theme from '../theme';
import { Attribute } from '../const';

const markup = util.svg /* xml*/ `
    <rect @selector="body" class="note-body"/>
    <foreignObject @selector="content" class="note-text"/>
`;

const TYPE = 'note';

/** A sticky note element for adding annotations to the diagram. */
export default class Note extends Node {
    
    static type = TYPE;
    
    static growthLimit = 0;
    
    preinitialize() {
        this.markup = markup;
    }
    
    defaults() {
        return {
            ...super.defaults(),
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            [Attribute.ContextMenu]: {
                // Offset the tool by 2px from the right side
                x: `calc(w - ${Theme.NodeToolSize + 2})`,
                y: 0
            },
            // Shape-specific attributes
            [Attribute.Markdown]: '',
            // JointJS attributes
            z: -1,
            type: TYPE,
            size: {
                width: Theme.NoteWidth,
                height: Theme.NoteHeight
            },
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
                    rx: Theme.NodeBorderRadius,
                    ry: Theme.NodeBorderRadius
                },
                content: {
                    x: Theme.NotePadding,
                    y: Theme.NotePadding,
                    width: `calc(w - ${Theme.NotePadding * 2})`,
                    height: `calc(h - ${Theme.NotePadding * 2})`,
                    fontSize: 14,
                    fontFamily: Theme.FontFamily,
                    fontWeight: 'normal',
                    style: { color: Theme.NoteTextColor }
                }
            }
        };
    }
    
    getMarkdown() {
        return this.get(Attribute.Markdown) || '';
    }
    
    setMarkdown(markdown, options) {
        this.set(Attribute.Markdown, markdown, options);
    }
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        this.updateContent();
        this.on(`change:${Attribute.Markdown}`, () => this.updateContent());
    }
    
    updateContent() {
        const converter = new Showdown.Converter();
        const html = converter.makeHtml(this.getMarkdown());
        this.attr('content/html', html);
    }
    
    getInspectorConfig() {
        return {
            ...super.getInspectorConfig(),
            headerText: 'Notes',
            headerIcon: 'assets/icons/note.svg',
        };
    }
}
