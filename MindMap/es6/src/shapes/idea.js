import { dia, V, util } from '@joint/plus';
const { Element, ElementView } = dia;

function measureText(svgDocument, text, attrs, annotations) {
    const vText = V('text').attr(attrs).text(text, annotations);
    vText.appendTo(svgDocument);
    const bbox = vText.getBBox();
    vText.remove();
    return bbox;
}

const LABEL_PROPERTY = 'label';
const ANNOTATIONS_PROPERTY = 'annotations';
const IMAGE_PROPERTY = 'image';
const IMAGE_SIZE_PROPERTY = 'imageSize';
const SPACING_PROPERTY = 'spacing';
const PLACEHOLDER_PROPERTY = 'placeholder';
const OUTLINE_COLOR_PROPERTY = 'outlineColor';
const FILL_COLOR_PROPERTY = 'fillColor';
const LINE_PROPERTY = 'line';

export class Idea extends Element {
    constructor() {
        super(...arguments);
        
        this.LABEL_PROPERTY = LABEL_PROPERTY;
        this.ANNOTATIONS_PROPERTY = ANNOTATIONS_PROPERTY;
        this.IMAGE_PROPERTY = IMAGE_PROPERTY;
        this.SPACING_PROPERTY = SPACING_PROPERTY;
        this.PLACEHOLDER_PROPERTY = PLACEHOLDER_PROPERTY;
        this.OUTLINE_COLOR_PROPERTY = OUTLINE_COLOR_PROPERTY;
        this.FILL_COLOR_PROPERTY = FILL_COLOR_PROPERTY;
        this.LINE_COLOR_PROPERTY = LINE_PROPERTY;
        this.IMAGE_SIZE_PROPERTY = IMAGE_SIZE_PROPERTY;
    }
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'Idea', [FILL_COLOR_PROPERTY]: 'white', [OUTLINE_COLOR_PROPERTY]: 'black', [LINE_PROPERTY]: true, [PLACEHOLDER_PROPERTY]: ' ', [SPACING_PROPERTY]: 5, [LABEL_PROPERTY]: '', [ANNOTATIONS_PROPERTY]: [], [IMAGE_PROPERTY]: '', [IMAGE_SIZE_PROPERTY]: 50 });
    }
    
    preinitialize() {
        this.labelAttributes = {
            'font-size': 14,
            'font-family': 'sans-serif',
            'cursor': 'text',
            'text-anchor': 'start'
        };
        this.imageAttributes = {
            'preserveAspectRatio': 'none',
        };
        this.cache = {};
    }
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on('change', this.onAttributeChange);
        this.setSizeFromContent();
    }
    
    /* Attributes that affect the size of the model. */
    onAttributeChange() {
        const { changed, cache } = this;
        if (PLACEHOLDER_PROPERTY in changed ||
            LABEL_PROPERTY in changed) {
            // invalidate the cache only if the text of the `label` has changed
            delete cache.label;
        }
        if (LABEL_PROPERTY in changed ||
            IMAGE_PROPERTY in changed ||
            IMAGE_SIZE_PROPERTY in changed ||
            SPACING_PROPERTY in changed ||
            PLACEHOLDER_PROPERTY in changed) {
            this.setSizeFromContent();
        }
    }
    
    setSizeFromContent() {
        delete this.cache.layout;
        const { width, height } = this.layout();
        this.resize(width, height);
    }
    
    layout() {
        const { cache } = this;
        let { layout } = cache;
        if (layout) {
            return layout;
        }
        else {
            layout = this.calcLayout();
            cache.layout = layout;
            return layout;
        }
    }
    
    calcLayout() {
        const { attributes, labelAttributes, cache } = this;
        const spacing = attributes[SPACING_PROPERTY];
        const imageSize = attributes[IMAGE_SIZE_PROPERTY];
        let width = spacing * 2;
        let height = spacing * 2;
        let x = spacing;
        let y = spacing;
        // image metrics
        let $image;
        if (attributes[IMAGE_PROPERTY]) {
            const w = imageSize;
            const h = imageSize;
            $image = {
                x,
                y,
                width: w,
                height: h,
            };
            height += spacing + h;
            y += spacing + h;
            width += w;
        }
        else {
            $image = null;
        }
        // label metrics
        let $label;
        {
            let w, h;
            if ('label' in cache) {
                w = cache.label.width;
                h = cache.label.height;
            }
            else {
                if (!Idea.sandbox) {
                    throw new Error('Cannot measure the text. No SVG provided.');
                }
                const { width: textWidth, height: textHeight } = measureText(Idea.sandbox, attributes[LABEL_PROPERTY] || attributes[PLACEHOLDER_PROPERTY], labelAttributes, attributes[ANNOTATIONS_PROPERTY]);
                w = textWidth;
                h = textHeight;
                cache.label = {
                    width: textWidth,
                    height: textHeight,
                };
            }
            width = Math.max(width, spacing + w + spacing);
            height += h;
            if (!h) {
                // no text
                height -= spacing;
            }
            $label = {
                x,
                y,
                width: w,
                height: h,
            };
        }
        if ($image) {
            // Horizontally align the image in the middle of the element.
            $image.x += (width - 2 * spacing - $image.width) / 2;
        }
        // root metrics
        return {
            x: 0,
            y: 0,
            width,
            height,
            $image,
            $label,
        };
    }
    
    // Image API
    
    hasImage() {
        return Boolean(this.get(IMAGE_PROPERTY));
    }
    
    removeImage(opt) {
        this.set(IMAGE_PROPERTY, null, opt);
    }
    
    addImage(imageUrl, opt) {
        this.set(IMAGE_PROPERTY, imageUrl, opt);
    }
    
    // Annotation API
    
    replaceAnnotationURL(index, url, urlText, opt) {
        const { label, annotations } = this;
        const annotation = annotations[index];
        if (!annotation)
            return;
        const { start, end, attrs } = annotation;
        const prevUrlText = label.slice(start, end);
        const newLabel = label.slice(0, start) + urlText + label.slice(start + prevUrlText.length);
        const newAnnotations = util.cloneDeep(annotations);
        if (url && urlText) {
            V.shiftAnnotations(newAnnotations, start + 1, urlText.length - prevUrlText.length);
            newAnnotations[index] = {
                url,
                attrs: Object.assign(util.cloneDeep(attrs), { 'data-url': url }),
                start,
                end: start + urlText.length
            };
        }
        else {
            newAnnotations.splice(index, 1);
        }
        this.startBatch('replace-annotation-url');
        this.set({
            [LABEL_PROPERTY]: newLabel,
            [ANNOTATIONS_PROPERTY]: newAnnotations
        }, opt);
        this.stopBatch('replace-annotation-url');
    }
    
    // Getters
    
    get level() {
        return this.get('level');
    }
    
    get siblingRank() {
        return this.get('siblingRank');
    }
    
    get direction() {
        return this.get('direction');
    }
    
    get label() {
        return this.get(LABEL_PROPERTY);
    }
    
    get annotations() {
        return this.get(ANNOTATIONS_PROPERTY);
    }
}

const FLAG_COLOR = '@color';
export class IdeaView extends ElementView {
    
    presentationAttributes() {
        return ElementView.addPresentationAttributes({
            // attributes that change the position and size of the DOM elements
            [LABEL_PROPERTY]: [ElementView.Flags.UPDATE],
            [ANNOTATIONS_PROPERTY]: [ElementView.Flags.UPDATE],
            [IMAGE_PROPERTY]: [ElementView.Flags.UPDATE],
            [IMAGE_SIZE_PROPERTY]: [ElementView.Flags.UPDATE],
            [LINE_PROPERTY]: [ElementView.Flags.UPDATE],
            [SPACING_PROPERTY]: [ElementView.Flags.UPDATE],
            [PLACEHOLDER_PROPERTY]: [ElementView.Flags.UPDATE],
            // attributes that do not affect the size
            [OUTLINE_COLOR_PROPERTY]: [FLAG_COLOR],
            [FILL_COLOR_PROPERTY]: [FLAG_COLOR],
        });
    }
    
    confirmUpdate(flag, opt) {
        let flags = super.confirmUpdate(flag, opt);
        if (this.hasFlag(flags, FLAG_COLOR)) {
            // When only a color is changed there is no need to resize the DOM elements
            this.updateColors();
            flags = this.removeFlag(flags, FLAG_COLOR);
        }
        // It must return 0
        return flags;
    }
    
    /* Runs only once while initializing */
    render() {
        const { vel, model } = this;
        const body = (this.vBody = V('rect').addClass('body'));
        const label = (this.vLabel = V('text')
            .addClass('label')
            .attr(model.labelAttributes)
            .attr({ 'data-section': 'text' }));
        this.vImage = V('image')
            .addClass('image')
            .attr(model.imageAttributes)
            .attr({
            'data-section': 'image'
        });
        vel.empty().append([body, label]);
        this.update();
        this.updateColors();
        // The default element `translate` method
        this.translate();
        return this;
    }
    
    update() {
        const $layout = this.model.layout();
        this.updateBody($layout);
        this.updateImage($layout.$image);
        this.updateLabel($layout.$label);
        this.cleanNodesCache();
    }
    
    updateColors() {
        const { model, vBody } = this;
        vBody.attr({
            fill: model.get(FILL_COLOR_PROPERTY),
            stroke: model.get(OUTLINE_COLOR_PROPERTY),
        });
    }
    
    updateBody($body) {
        const { model, vBody } = this;
        const { width, height } = $body;
        const isLine = model.get(LINE_PROPERTY);
        const bodyAttributes = {
            'width': width,
            'height': height,
            'rx': isLine ? 0 : 5,
            'ry': isLine ? 0 : 5,
            'stroke-width': isLine ? 2 : 1,
            'stroke-dasharray': isLine
                ? `0,${width + height},${width},${height}`
                : 'none',
        };
        vBody.attr(bodyAttributes);
    }
    
    updateImage($image) {
        const { model, vImage, vel } = this;
        const image = model.get(IMAGE_PROPERTY);
        if (image) {
            const currentImage = vImage.attr('xlink:href');
            if (currentImage !== image) {
                vImage.attr('xlink:href', image);
            }
            vImage.attr({
                x: $image.x,
                y: $image.y,
                width: $image.width,
                height: $image.height
            });
            if (!vImage.parent()) {
                vel.append(vImage);
            }
        }
        else {
            vImage.remove();
        }
    }
    
    updateLabel($label) {
        const { model, vLabel } = this;
        vLabel.attr({
            x: $label.x,
            y: $label.y + $label.height / 2,
        });
        vLabel.text(model.get(LABEL_PROPERTY), {
            textVerticalAnchor: 'middle',
            annotations: model.get(ANNOTATIONS_PROPERTY)
        });
    }
    
    getLabelNode() {
        return this.vLabel.node;
    }
}
