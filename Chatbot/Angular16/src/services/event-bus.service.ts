/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { Injectable } from '@angular/core';
import type { Observable, Subscription } from 'rxjs';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { mvc } from '@joint/plus';

interface SharedEvent {
    name: string;
    value: any;
}

@Injectable({
    providedIn: 'root'
})
export class EventBusService implements mvc.Events {

    on: mvc.Events_On<EventBusService>;
    off: mvc.Events_Off<EventBusService>;
    trigger: mvc.Events_Trigger<EventBusService>;
    bind: mvc.Events_On<EventBusService>;
    unbind: mvc.Events_Off<EventBusService>;

    once: mvc.Events_On<EventBusService>;
    listenTo: mvc.Events_Listen<EventBusService>;
    listenToOnce: mvc.Events_Listen<EventBusService>;
    stopListening: mvc.Events_Stop<EventBusService>;

    constructor() {
        Object.assign(this, mvc.Events);
    }

    private _events = new Subject<SharedEvent>();

    events(): Observable<SharedEvent> {
        return this._events.asObservable();
    }

    emit(eventName: string, value?: any): void {
        this._events.next({ name: eventName, value: value });
    }

    subscribe(eventName: string, callback: any): Subscription {
        return this._events.pipe(
            filter(e => e.name === eventName),
            map(e => e.value)
        ).subscribe(callback);
    }
}
