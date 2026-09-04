import { dia, V, mvc } from '@joint/core';

// ---- Types ----

export interface Cursor {
    x: number;
    y: number;
}

interface UserAppearance {
    name: string;
    color: string;
}

interface UserCursorOptions extends mvc.ViewOptions<undefined, SVGGElement> {
    paper: dia.Paper;
    user: UserAppearance;
    cursor: Cursor;
}

// ---- UserCursor view ----

export class UserCursor extends mvc.View<undefined, SVGGElement> {
    paper!: dia.Paper;
    user!: UserAppearance;
    cursor!: Cursor;

    preinitialize(options: UserCursorOptions) {
        this.tagName = 'g';
        this.svgElement = true;
        this.paper = options.paper;
        this.user = options.user;
        this.cursor = options.cursor;
    }

    attributes = {
        pointerEvents: 'none',
        filter: 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.4))',
    };

    render(): this {
        V('circle', { r: 5, fill: this.user.color }).appendTo(this.el);
        V('text', {
            x: 10,
            y: 4,
            fontSize: 12,
            fontFamily: 'sans-serif',
            fill: this.user.color,
        })
            .appendTo(this.el)
            .text(this.user.name);

        this.update();
        this.vel.appendTo(this.paper.getLayerView(dia.Paper.Layers.FRONT).el);
        return this;
    }

    update() {
        this.vel.attr('transform', `translate(${this.cursor.x}, ${this.cursor.y})`);
    }
}
