/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AppModule } from './app.module';


describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                teardown: {
                    destroyAfterEach: true,
                    rethrowErrors: false
                },
                imports: [AppModule],
            })

            .compileComponents()

            .then(() => {
                fixture = TestBed.createComponent(AppComponent);
                component = fixture.componentInstance;
            });
    }));

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create app component', () => {
        expect(component).toBeTruthy();
    });
});
