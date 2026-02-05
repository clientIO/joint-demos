import { g, shapes } from '@joint/plus';

export function editElementLabel(elementView) {
    const paper = elementView.paper;
    const element = elementView.model;
    let bbox;
    
    const bodySelector = 'header';
    let labelSelector;
    const textAttrPath = 'text';
    let rotate = false;
    let allowNewLine = true; // `true` = allowed to shift+enter to write a newline
    let setTextarea = (textarea) => {
        textarea.style.outline = '2px solid #333';
    };
    
    let bgSelector;
    if (!(shapes.bpmn2.CompositePool.isPool(element) || shapes.bpmn2.Swimlane.isSwimlane(element) || shapes.bpmn2.Phase.isPhase(element))) {
        const elementType = element.get('type');
        switch (elementType) {
            case 'custom.Activity':
            case 'custom.Event': {
                bgSelector = 'background';
                labelSelector = 'label';
                break;
            }
            case 'custom.Gateway': {
                bgSelector = 'body';
                labelSelector = 'label';
                break;
            }
        }
        switch (elementType) {
            case 'custom.Gateway':
            case 'custom.Event': {
                // Does not allow using the calc() expression in the `textWrap` attribute.
                // Real margin between the element and the label is not taken into account.
                const textMargin = 5;
                let width = element.attr(['label', 'textWrap', 'width']);
                if (!Number.isFinite(width)) {
                    throw new Error('The `label/textWrap/width` attribute must be a number.');
                }
                width += 2 * textMargin; // padding
                let height = element.attr(['label', 'textWrap', 'height']);
                if (!Number.isFinite(height)) {
                    throw new Error('The `label/textWrap/height` attribute must be a number.');
                }
                const elementBBox = element.getBBox();
                bbox = new g.Rect({
                    x: elementBBox.x - (width - elementBBox.width) / 2,
                    y: elementBBox.y + elementBBox.height + textMargin,
                    width,
                    height
                });
                setTextarea = (textarea) => {
                    textarea.style.outline = '1px dotted #666';
                    textarea.style.paddingTop = `${textMargin}px`;
                };
                break;
            }
        }
        
    }
    else {
        bgSelector = 'header';
        labelSelector = 'headerText';
    }
    
    if (!bbox) {
        const node = elementView.findNode(bgSelector);
        bbox = elementView.getNodeBBox(node);
    }
    
    if ((element instanceof shapes.bpmn2.HeaderedHorizontalPool) || (element instanceof shapes.bpmn2.HeaderedVerticalPool)) {
        const headerSide = element.getHeaderSide();
        if (headerSide === 'left' || headerSide === 'right') {
            bbox.rotateAroundCenter(-90);
            rotate = true;
        }
        
    }
    else if (shapes.bpmn2.Swimlane.isSwimlane(element) || shapes.bpmn2.Phase.isPhase(element)) {
        allowNewLine = false;
        
        const headerSide = element.getHeaderSide();
        if (headerSide === 'left' || headerSide === 'right') {
            bbox.rotateAroundCenter(-90);
            rotate = true;
        }
    }
    
    bbox.inflate(-1);
    
    editText(paper, element, bbox, 'attrs/', {
        bodySelector,
        labelSelector,
        textAttrPath,
        rotate,
        allowNewLine,
        setTextarea
    });
}

function editText(paper, element, bbox, basePath, options) {
    const { bodySelector = 'body', labelSelector = 'label', textAttrPath, setTextarea = () => { }, allowNewLine = false, prefix = '', rotate = false } = options;
    
    const baseLabelPath = basePath + labelSelector + '/';
    const baseBodyPath = basePath + bodySelector + '/';
    const textPath = baseLabelPath + textAttrPath;
    const fontSize = element.prop(baseLabelPath + 'fontSize');
    
    let matrix = paper.matrix();
    if (rotate) {
        matrix = matrix
            .rotate(-90)
            .translate(-bbox.y - bbox.width / 2 - bbox.height / 2, bbox.x - bbox.height / 2 + bbox.width / 2);
    }
    else {
        matrix = matrix.translate(bbox.x, bbox.y);
    }
    
    const text = (element.prop(textPath) || '').substr(prefix.length);
    const textarea = document.createElement('textarea');
    
    // Position & Size
    textarea.style.position = 'absolute';
    textarea.style.boxSizing = 'border-box';
    textarea.style.width = bbox.width + 'px';
    textarea.style.height = bbox.height + 'px';
    textarea.style.transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`;
    textarea.style.transformOrigin = '0 0';
    textarea.style.padding = `${(bbox.height - fontSize) / 2 - 2}px 0 0`;
    
    // Content
    textarea.value = text;
    
    // Styling
    textarea.style.fontSize = fontSize + 'px';
    textarea.style.fontFamily = element.prop(baseLabelPath + 'fontFamily');
    textarea.style.fontWeight = element.prop(baseLabelPath + 'fontWeight');
    textarea.style.color = element.prop(baseLabelPath + 'fill');
    textarea.style.background = element.prop(baseBodyPath + 'fill');
    textarea.style.textAlign = 'center';
    textarea.style.resize = 'none';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    
    setTextarea(textarea);
    paper.el.appendChild(textarea);
    
    textarea.focus();
    
    // Select all text
    textarea.setSelectionRange(0, textarea.value.length);
    textarea.addEventListener('blur', function () {
        const text = prefix + textarea.value;
        element.prop(textPath, text);
        textarea.remove();
    });
    
    textarea.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' && (!allowNewLine || !evt.shiftKey)) {
            textarea.blur();
        }
        if (evt.key === 'Escape') {
            textarea.value = element.prop(textPath).substr(prefix.length);
            textarea.blur();
        }
    });
}
