import type { dia } from '@joint/core';

import { UserCursor, type Cursor } from './user-cursor';

// ---- User entity ----

export class User {
    name: string;
    color: string;
    private _cursorView: UserCursor | null = null;

    constructor(name: string, color: string) {
        this.name = name;
        this.color = color;
    }

    updateCursor(paper: dia.Paper, cursor: Cursor): void {
        if (this._cursorView) {
            this._cursorView.cursor = cursor;
            this._cursorView.update();
        } else {
            this._cursorView = new UserCursor({ paper, user: this, cursor });
            this._cursorView.render();
        }
    }

    removeCursor(): void {
        this._cursorView?.remove();
        this._cursorView = null;
    }
}
