import { util } from '@joint/plus';
import Showdown from 'showdown';
import Node from './Node';
import { Attribute } from '../const';
import Theme from '../theme';

import type { dia } from '@joint/plus';
import type { NodeAttributes } from './Node';
import type { InspectorConfig } from '../../types';

const markup = util.svg/* xml*/`
    <rect @selector="body" class="note-body"/>
    <foreignObject @selector="content" class="note-text"/>
`;

const TYPE = 'note';

export default class Note extends Node {

    static type = TYPE;

    static growthLimit = 0;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<NodeAttributes> {
        const attributes: Partial<NodeAttributes> = {
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            [Attribute.ContextMenu]: { x: 'calc(w - 35)', y: 5 },
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
                    rx: Theme.NoteBorderRadius,
                    ry: Theme.NoteBorderRadius
                },
                content: {
                    x: Theme.NotePadding,
                    y: Theme.NotePadding,
                    width: `calc(w-${Theme.NotePadding * 2})`,
                    height: `calc(h-${Theme.NotePadding * 2})`,
                    fontSize: 14,
                    fontFamily: 'Arial',
                    fontWeight: 'normal',
                    fill: Theme.NoteTextColor,
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word'
                }
            }
        };


        return util.defaultsDeep(attributes, super.defaults());
    }

    getMarkdown(): string {
        return this.get(Attribute.Markdown) || '';
    }

    setMarkdown(markdown: string, options?: dia.Cell.Options) {
        this.set(Attribute.Markdown, markdown, options);
    }

    initialize(attributes: dia.Element.Attributes, options: dia.Cell.Options): void {
        super.initialize(attributes, options);

        this.updateContent();
        this.on(`change:${Attribute.Markdown}`, () => this.updateContent());
    }

    updateContent(): void {
        const converter = new Showdown.Converter();
        const html = converter.makeHtml(this.getMarkdown());
        this.attr('content/html', html);
    }

    getInspectorConfig(): InspectorConfig {
        return {
            ...super.getInspectorConfig(),
            headerText: 'Note',
            headerHint: 'Add notes for context and collaboration',
            headerIcon: 'assets/icons/note.svg',
        };
    }
}
