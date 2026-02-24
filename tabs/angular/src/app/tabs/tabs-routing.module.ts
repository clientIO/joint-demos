import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TabsContainerComponent } from './tabs-container/tabs-container.component';

import type { Routes } from '@angular/router';

const routes: Routes = [
    { path: 'tabs-container', component: TabsContainerComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TabsRoutingModule { }
