/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import { StencilService } from '../services/stencil-service';
import { ToolbarService } from '../services/toolbar-service';
import { InspectorService } from '../services/inspector-service';
import { HaloService } from '../services/halo-service';
import { KeyboardService } from '../services/keyboard-service';
import { NavigatorService } from '../services/navigator-service';
import RappidService from '../services/kitchensink-service';

import { sampleGraphs } from '../config/sample-graphs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
    // Containers
    @ViewChild('paperContainer', { static: true })
        paperContainer: ElementRef;

    @ViewChild('stencilContainer', { static: true })
        stencilContainer: ElementRef;

    @ViewChild('toolbarContainer', { static: true })
        toolbarContainer: ElementRef;

    @ViewChild('inspectorContainer', { static: true })
        inspectorContainer: ElementRef;

    @ViewChild('navigatorContainer', { static: true })
        navigatorContainer: ElementRef;

    // Additional inspector elements
    @ViewChild('openGroupsButton', { static: true })
        openGroupsButton: ElementRef;

    @ViewChild('closeGroupsButton', { static: true })
        closeGroupsButton: ElementRef;

    @ViewChild('inspectorHeader', { static: true })
        inspectorHeader: ElementRef;

    @ViewChild('inspectorContent', { static: true })
        inspectorContent: ElementRef;

    private rappid: RappidService;

    constructor(private element: ElementRef) { }

    ngOnInit() {
        const services = {
            stencilService: new StencilService(this.stencilContainer.nativeElement),
            toolbarService: new ToolbarService(this.toolbarContainer.nativeElement),
            inspectorService: new InspectorService({
                openGroupsButton: this.openGroupsButton.nativeElement,
                closeGroupsButton: this.closeGroupsButton.nativeElement,
                container: this.inspectorContainer.nativeElement,
                header: this.inspectorHeader.nativeElement,
                content: this.inspectorContent.nativeElement
            }),
            haloService: new HaloService(),
            keyboardService: new KeyboardService(),
            navigatorService: new NavigatorService(this.navigatorContainer.nativeElement)
        };

        this.rappid = new RappidService(
            this.element.nativeElement,
            this.paperContainer.nativeElement,
            services
        );

        this.rappid.startRappid();

        this.rappid.graph.fromJSON(JSON.parse(sampleGraphs.emergencyProcedure), { ignoreUndoRedo: true });
    }
}
