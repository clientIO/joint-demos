import { dia, util } from '@joint/plus';

export class DurationNumberInput extends dia.HighlighterView {
    
    preinitialize() {
        this.UPDATE_ATTRIBUTES = ['active', 'duration'];
        this.tagName = 'g';
    }
    
    events() {
        return {
            'change input': (evt) => { this.onChange(evt); },
            'click input': (evt) => { this.onClick(evt); },
            'focus input': (evt) => { this.onFocus(evt); },
            'blur input': (evt) => { this.onBlur(evt); }
        };
    }
    
    highlight(view) {
        let active = view.model.get('active');
        
        const duration = view.model.get('duration');
        const topColor = view.model.get('topColor');
        const sideColor = view.model.get('sideColor');
        const textColor = view.model.get('labelColor');
        
        const circlePosition = {
            x: view.model.size().width - 15,
            y: view.model.size().height - 15
        };
        const inputPosition = {
            x: view.model.size().width - 39,
            y: view.model.size().height - 25
        };
        let markup;
        if (active) {
            this.el.setAttribute('transform', `translate(${inputPosition.x},${inputPosition.y})`);
            markup = util.svg /* xml */ `
                <g width="34" height="20">
                    <path d="M0.5 4C0.5 2.067 2.067 0.5 4 0.5H30C31.933 0.5 33.5 2.067 33.5 4V16C33.5 17.933 31.933 19.5 30 19.5H4C2.067 19.5 0.5 17.933 0.5 16V4Z" fill="${topColor}" stroke="${sideColor}"/>
                </g>
                <g fill="${textColor}" stroke-width="0" transform="translate(5,4)">
                    <path d="M4.07473 9.42721C4.07473 9.42721 1.94427 10.5 1.35143 10.0351C0.758582 9.57026 1.94426 7.29712 1.94426 7.29712L4.07473 9.42721Z"/>
                    <path d="M2.40379 6.90294L4.53394 9.03369L9.31839 4.25059L7.18824 2.11983L2.40379 6.90294Z"/>
                    <path d="M7.61307 1.69461L9.74329 3.82422L10.8084 2.75884L8.67815 0.629233L7.61307 1.69461Z"/>
                </g>
                <foreignObject transform="translate(15,0)" width="20" height="20">
                    <div xmlns="http://www.w3.org/1999/xhtml">
                        <input @selector="input" style="color:${textColor}" class="jj-yamazumi-duration-input" type="text" maxLength="2" value="${duration}" oninput="this.value = this.value.replace(/[^0-9]/g, '');"/>
                    </div>
                </foreignObject>
            `;
        }
        else {
            this.el.setAttribute('transform', `translate(${circlePosition.x + 1},${circlePosition.y})`);
            markup = util.svg /* xml */ `
                <circle @selector="duration" r="10" fill="${topColor}" stroke-width="0" class="jj-yamazumi-duration"></circle>
                <text @selector="durationText" alignment-baseline="middle" x="0" y="1" stroke="none" fill="${textColor}" class="jj-yamazumi-duration-text">
                    ${duration}
                </text>
            `;
        }
        
        this.renderChildren(markup);
    }
    
    onChange(evt) {
        let value = Number(evt.target.value);
        const duration = this.cellView.model.get('duration');
        const stack = this.options.layoutView.model.getStackFromElement(this.cellView.model);
        const currentDuration = stack.elements.reduce((agg, el) => agg + el.get('duration'), 0) - duration;
        value = Math.max(value, this.options.minDuration);
        if (currentDuration + value > this.options.maxDuration) {
            value = this.options.maxDuration - currentDuration;
        }
        this.cellView.model.set('duration', value);
        
    }
    
    onFocus(_evt) {
        this.cellView.model.set('focused', true);
    }
    
    onBlur(_evt) {
        this.cellView.model.set('focused', false);
        if (!this.cellView.model.get('hovered')) {
            this.cellView.model.set('active', false);
        }
    }
    
    onClick(evt) {
        this.cellView.preventDefaultInteraction(evt);
    }
}
