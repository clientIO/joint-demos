import { elementTools, util, g } from '@joint/plus';

export class RotateTool extends elementTools.Control {
    
    preinitialize() {
        const { buttonColor = '#333', iconColor = '#fff', outlineColor = '#fff' } = this.options;
        this.children = util.svg /* xml */ `
            <g @selector="handle" cursor="grab">
                <circle r="10" fill="${buttonColor}" stroke="${outlineColor}" />
                <text x="15"
                    font-size="16"
                    font-family="sans-serif"
                    fill="${buttonColor}"
                    stroke="${iconColor}"
                    stroke-width="3"
                    paint-order="stroke"
                    pointer-events="none"
                >
                    <tspan @selector="degrees" x="15" dy="0" font-size="16">0°</tspan>
                    <tspan @selector="position" x="15" dy="1.2em" font-size="10">0, 0</tspan>
                </text>
                <path d="M -5 0 A 5 5 0 1 1 0 5" fill="transparent" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" />
                <path d="M -3 5 L 0 2.5 0 7.5 Z" fill="${iconColor}" stroke="${iconColor}" stroke-width="1" transform="rotate(-5, -3, 5)" />
            </g>
        `;
    }
    
    update() {
        super.update();
        this.updateText();
    }
    
    updateText() {
        const { childNodes, relatedView } = this;
        childNodes.degrees.textContent = `${relatedView.model.get('rotation')}°`;
        childNodes.position.textContent = relatedView.model.position().round(2).toString();
    }
    
    getPosition(view) {
        const { gap = 0 } = this.options;
        const model = view.model;
        const { rotation = 0, cx0 } = model.attributes;
        const center = model.getCenterOfRotation();
        const position = center.clone().translate(cx0 + gap, 0);
        position.rotate(center, -rotation);
        return position;
    }
    
    setPosition(view, coordinates, evt) {
        const model = view.model;
        const center = model.getCenterOfRotation();
        let newAngle = Math.round(center.angleBetween(coordinates, center.clone().translate(1, 0)));
        
        // Change the angle by 5 degrees and snap to 0, 45, 90, 135, 180, 225, 270, 315
        // unless the shift key is pressed.
        const snapAngle = evt.shiftKey ? 1 : 5;
        newAngle = Math.round(newAngle / snapAngle) * snapAngle;
        
        if (model.isWithinBBox(view.paper.getArea(), { angle: newAngle })) {
            // Do not rotate if the element would be out of the paper
            // Note: we could also find the nearest angle that would fit the element
            // Perhaps by binary search between the current angle and the target angle.
            return;
        }
        model.set('rotation', g.normalizeAngle(newAngle));
    }
    
    resetPosition(view) {
        const model = view.model;
        model.set('rotation', 0);
    }
}
