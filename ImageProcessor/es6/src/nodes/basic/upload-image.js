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
import { util } from '@joint/plus';
import * as cv from '@techstark/opencv-js';
import { App } from '../../app';
export class UploadView extends NodeView {
    constructor() {
        super(...arguments);
        this.imageMode = 'small';
    }
    
    renderMarkup() {
        super.renderMarkup();
        
        this.model.set('canvas', this.findNode('canvas'));
        return this;
    }
    
    events() {
        return Object.assign(Object.assign({}, super.events()), { 'dblclick image': (evt) => { this.onImageDblClick(evt); } });
    }
    
    onImageDblClick(_evt) {
        if (this.imageMode === 'small') {
            this.model.attr('image/width', 200);
            this.model.attr('image/height', 200);
            this.model.size(305, 235);
            this.imageMode = 'large';
        }
        else {
            this.model.attr('image/width', 40);
            this.model.attr('image/height', 40);
            this.model.size(145, 75);
            this.imageMode = 'small';
        }
    }
}
export class Upload extends Node {
    
    constructor(attributes, options) {
        super(attributes, options);
        
        this.canvas = document.createElement('canvas');
        
        const url = this.prop('properties/url');
        if (url) {
            this.getDataFromUrl(url).then(data => {
                if (App.processor) {
                    App.processor.updateCurrentData(this.id, data);
                }
            });
        }
    }
    
    
    preinitialize() {
        super.preinitialize();
        
        const markup = util.svg /* xml */ `
            <image @selector="image" />
        `;
        
        this.markup = this.markup.concat(markup);
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Upload',
            name: 'Upload',
            inputSettings: [{
                    name: 'Url',
                    type: 'string',
                    property: 'url'
                }],
            outputSettings: [{
                    name: 'Image',
                    type: 'image',
                }],
            size: {
                width: 145,
                height: 75
            },
            attrs: {
                image: {
                    cursor: 'pointer',
                    width: 40,
                    height: 40,
                    x: 50,
                    y: 29,
                    href: 'assets/defaultImage.png',
                    preserveAspectRatio: 'xMidYMid'
                }
            }
        }, defaults);
    }
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
            const { url } = this.properties;
            if (url) {
                try {
                    this.attr('image/href', url);
                    return this.getDataFromUrl(url);
                }
                catch (_a) {
                    return [null];
                }
            }
            
            return [null];
        });
    }
    
    getDataFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = this.canvas;
                    
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    
                    const mat = cv.imread(canvas);
                    resolve([mat]);
                }
                catch (error) {
                    reject(error);
                }
            };
            img.src = url;
        });
    }
    
    getContextToolbarItems() {
        return [{
                action: 'uploadImage',
                content: 'Upload Image',
                attrs: {
                    'group': 'node-tools'
                }
            }];
    }
    
    setContextToolbarEvents(contextToolbar) {
        contextToolbar.on('action:uploadImage', () => {
            contextToolbar.remove();
            
            const fileInput = document.createElement('input');
            fileInput.setAttribute('type', 'file');
            fileInput.setAttribute('accept', 'image/*');
            
            fileInput.click();
            
            fileInput.onchange = () => {
                const file = fileInput.files[0];
                const imageURL = URL.createObjectURL(file);
                
                const img = new Image();
                img.onload = () => {
                    const canvas = this.canvas;
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    
                    const mat = cv.imread(canvas);
                    App.processor.updateCurrentData(this.id, [mat]);
                };
                img.src = imageURL;
                this.attr('image/href', imageURL);
            };
        });
    }
}
