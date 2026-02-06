/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ChatbotModule } from './chatbot/chatbot.module';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        ChatbotModule
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
