import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import type { Routes } from '@angular/router';

const routes: Routes = [
    { path: '', redirectTo: '/tree-container', pathMatch: 'full' },
    { path: '**', redirectTo: '/tree-container', pathMatch: 'full' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
