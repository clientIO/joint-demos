/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { Component, OnInit, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { EventBusService } from '../../services/event-bus.service';
import { SharedEvents } from '../../joint-plus/controller';

const DEBOUNCE_TIME_MS = 500;

@Component({
    selector: 'chatbot-json-editor',
    templateUrl: './json-editor.component.html',
    styleUrls: ['./json-editor.component.scss']
})
export class JsonEditorComponent implements OnInit {

    @Input() content: object;
    public placeholder = 'e.g. { "cells": [{ "type": "app.Message"}] }';
    public contentSubject = new Subject<object>();

    constructor(private eventBusService: EventBusService) {
    }

    public ngOnInit(): void {
        const { contentSubject, eventBusService } = this;
        contentSubject.pipe(debounceTime(DEBOUNCE_TIME_MS)).subscribe((json: object) => {
            eventBusService.emit(SharedEvents.JSON_EDITOR_CHANGED, json);
        });
    }

    public parseJSON(jsonString: string): void {
        const { contentSubject } = this;
        let json;
        if (!jsonString) {
            json = { cells: [] };
        } else {
            try {
                json = JSON.parse(jsonString);
            } catch {
                // Invalid JSON
                return;
            }
        }
        contentSubject.next(json);
    }
}
