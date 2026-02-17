import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TreeContainerComponent } from './tree-container/tree-container.component';

const routes: Routes = [
  { path: 'tree-container', component: TreeContainerComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TreeRoutingModule { }
