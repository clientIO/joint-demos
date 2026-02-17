import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { TabsRoutingModule } from './tabs-routing.module';
import { TabsContainerComponent } from './tabs-container/tabs-container.component';
import { TabComponent } from './tab/tab.component';


@NgModule({
  declarations: [
    TabsContainerComponent,
    TabComponent
  ],
  imports: [
    CommonModule,
    TabsRoutingModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class TabsModule { }
