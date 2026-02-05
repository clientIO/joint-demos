/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { TestBed, ComponentFixture, waitForAsync } from '@angular/core/testing';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ChatbotComponent } from './chatbot.component';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import { InspectorComponent } from '../inspector/inspector.component';
import { MessageInspectorComponent } from '../inspector/message-inspector/message-inspector.component';
import { LabelInspectorComponent } from '../inspector/label-inspector/label-inspector.component';
import { LinkInspectorComponent } from '../inspector/link-inspector/link-inspector.component';
import { BatchDirective } from '../../directives/batch.directive';
import { EventBusService } from '../../services/event-bus.service';


describe('ChatbotComponent', () => {
    let component: ChatbotComponent;
    let fixture: ComponentFixture<ChatbotComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            teardown: {
                destroyAfterEach: true
            },
            declarations: [
                ChatbotComponent,
                JsonEditorComponent,
                InspectorComponent,
                MessageInspectorComponent,
                LabelInspectorComponent,
                LinkInspectorComponent,
                BatchDirective
            ],
            providers: [
                EventBusService
            ],
            imports: [
                BrowserModule,
                FormsModule,
                ReactiveFormsModule
            ],
        }).compileComponents()

            .then(() => {
                fixture = TestBed.createComponent(ChatbotComponent);
                component = fixture.componentInstance;
            });
    }));

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create chatbot component', () => {
        expect(component).toBeTruthy();
    });

    it('should render container and add joint-scope class', () => {
        const JOINT_SCOPE_CLASS_NAME = 'joint-scope';
        const compiled = fixture.debugElement.nativeElement;
        expect(compiled.className).toBe(JOINT_SCOPE_CLASS_NAME);
    });
});
