import type { ActionResult, NodeAttributes } from '../node';
import { Node, NodeView } from '../node';
import type { mvc, dia } from '@joint/plus';
import { ui, util } from '@joint/plus';
import * as cv from '@techstark/opencv-js';
export class DisplayView extends NodeView {

    initialize(): void {
        super.initialize();

        if (this.model.get('imageMode') === 'large') {
            this.model.attr('image/width', 200);
            this.model.attr('image/height', 200);
            this.model.size(265, 235);
        }
    }

    events(): mvc.EventsHash {
        return {
            ...super.events(),
            'dblclick image': (evt: dia.Event) => { this.onImageDblClick(evt); },
        };
    }

    onImageDblClick(_evt: dia.Event) {
        if (this.model.get('imageMode') === 'small') {
            this.model.attr('image/width', 200);
            this.model.attr('image/height', 200);
            this.model.size(265, 235);
            this.model.set('imageMode', 'large');
        } else {
            this.model.attr('image/width', 40);
            this.model.attr('image/height', 40);
            this.model.size(105, 75);
            this.model.set('imageMode', 'small');
        }
    }
}
export class Display extends Node {
    canvas: HTMLCanvasElement;

    constructor(attributes?: NodeAttributes, options?: dia.Graph.Options) {
        super(attributes, options);
        this.canvas = document.createElement('canvas');
    }

    preinitialize() {
        super.preinitialize();

        const markup: dia.MarkupJSON = util.svg/* xml */`
            <image @selector="image" />
        `;

        this.markup = (<dia.MarkupJSON>this.markup).concat(markup);
    }

    defaults(): NodeAttributes {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Display',
            name: 'Display',
            inputSettings: [{
                name: 'Image',
                type: 'image',
                property: 'image'
            }],
            size: {
                width: 105,
                height: 75
            },
            attrs: {
                image: {
                    cursor: 'pointer',
                    width: 40,
                    height: 40,
                    x: 60,
                    y: 29,
                    href: 'assets/defaultImage.png',
                    preserveAspectRatio: 'xMidYMid'
                }
            }
        }, defaults) as NodeAttributes;
    }

    async action(): Promise<ActionResult> {
        const { image }: { image: cv.Mat } = this.properties;
        if (image) {
            cv.imshow(this.canvas, image);
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                this.attr('image/href', url);
            });
        } else {
            this.attr('image/href', 'assets/defaultImage.png');
        }
        return [];
    }

    getContextToolbarItems(): any[] {
        const nodeItems = super.getContextToolbarItems();
        return nodeItems.concat([{
            action: 'exportImage',
            content: 'Export Image',
            attrs: {
                'group': 'node-tools'
            }
        }]);
    }

    setContextToolbarEvents(contextToolbar: ui.ContextToolbar): void {
        contextToolbar.on('action:exportImage', () => {
            contextToolbar.remove();

            new ui.Lightbox({
                image: this.attr('image/href'),
                downloadable: true,
                fileName: `${this.get('name')}.png`
            }).open();
        });
    }

    getFileAttributes(): string[] {
        return super.getFileAttributes().concat(['imageMode']);
    }
}
