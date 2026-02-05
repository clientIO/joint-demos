var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Node, NodeView } from '../node';
import { ui, util } from '@joint/plus';
import * as cv from '@techstark/opencv-js';
export class DisplayView extends NodeView {
    
    initialize() {
        super.initialize();
        
        if (this.model.get('imageMode') === 'large') {
            this.model.attr('image/width', 200);
            this.model.attr('image/height', 200);
            this.model.size(265, 235);
        }
    }
    
    events() {
        return Object.assign(Object.assign({}, super.events()), { 'dblclick image': (evt) => { this.onImageDblClick(evt); } });
    }
    
    onImageDblClick(_evt) {
        if (this.model.get('imageMode') === 'small') {
            this.model.attr('image/width', 200);
            this.model.attr('image/height', 200);
            this.model.size(265, 235);
            this.model.set('imageMode', 'large');
        }
        else {
            this.model.attr('image/width', 40);
            this.model.attr('image/height', 40);
            this.model.size(105, 75);
            this.model.set('imageMode', 'small');
        }
    }
}
export class Display extends Node {
    
    preinitialize() {
        super.preinitialize();
        
        this.canvas = document.createElement('canvas');
        
        const markup = util.svg /* xml */ `
            <image @selector="image" />
        `;
        
        this.markup = this.markup.concat(markup);
    }
    
    defaults() {
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
        }, defaults);
    }
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
            const { image } = this.properties;
            if (image) {
                cv.imshow(this.canvas, image);
                this.canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    this.attr('image/href', url);
                });
            }
            else {
                this.attr('image/href', 'assets/defaultImage.png');
            }
            return [];
        });
    }
    
    getContextToolbarItems() {
        const nodeItems = super.getContextToolbarItems();
        return nodeItems.concat([{
                action: 'exportImage',
                content: 'Export Image',
                attrs: {
                    'group': 'node-tools'
                }
            }]);
    }
    
    setContextToolbarEvents(contextToolbar) {
        contextToolbar.on('action:exportImage', () => {
            contextToolbar.remove();
            
            new ui.Lightbox({
                image: this.attr('image/href'),
                downloadable: true,
                fileName: `${this.get('name')}.png`
            }).open();
        });
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['imageMode']);
    }
}
