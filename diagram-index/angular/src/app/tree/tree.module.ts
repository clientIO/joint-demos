import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TreeRoutingModule } from './tree-routing.module';
import { TreeContainerComponent } from './tree-container/tree-container.component';

@NgModule({
  declarations: [
    TreeContainerComponent
  ],
  imports: [
    CommonModule,
    TreeRoutingModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class TreeModule { }
