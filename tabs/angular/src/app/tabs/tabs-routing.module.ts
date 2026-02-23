import { NgModule } from '@angular/core';
import type { Routes } from '@angular/router';
import { RouterModule } from '@angular/router';
import { TabsContainerComponent } from './tabs-container/tabs-container.component';

const routes: Routes = [
    { path: 'tabs-container', component: TabsContainerComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TabsRoutingModule { }
