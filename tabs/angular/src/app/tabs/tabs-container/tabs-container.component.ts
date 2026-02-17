import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { ui } from '@joint/plus';
import { TabComponent } from '../tab/tab.component';
import { TabsDataService } from '../tabs-data.service';
import { Tab } from '../tabs.models';

@Component({
  selector: 'app-tabs-container',
  templateUrl: './tabs-container.component.html',
  styleUrls: ['./tabs-container.component.scss']
})
export class TabsContainerComponent implements OnInit, AfterViewInit {
  tabs: Tab[];

  @ViewChild('tabGroup') tabGroup: MatTabGroup;
  @ViewChildren('tab') tabComponents: QueryList<TabComponent>;

  theme = 'material';

  constructor(
    private tabsDataService: TabsDataService,
    private elRef: ElementRef) {
    this.tabs = this.tabsDataService.getTabs();
  }

  tooltip = new ui.Tooltip({
    theme: this.theme,
    rootTarget: this.elRef.nativeElement,
    container: this.elRef.nativeElement,
    target: '[data-tooltip]',
    direction: ui.Tooltip.TooltipArrowPosition.Auto,
    position: ui.Tooltip.TooltipPosition.Top,
    padding: 10,
    animation: true
  });

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    if (this.tabGroup.selectedIndex !== null) {
      this.tabComponents.get(this.tabGroup.selectedIndex)?.focus();
    }
  }

  onTabChange(evt: MatTabChangeEvent) {
    this.tabComponents.get(evt.index)?.focus();
    this.tabComponents.forEach((tab, i) => {
      if (i !== evt.index) {
        tab.blur();
      }
    });
  }

  onLinkClick(id: string) {
    const index = this.tabs.findIndex(tab => tab.id === id);
    if (index !== -1) {
      this.tabGroup.selectedIndex = index;
    } else {
      const message = new ui.FlashMessage({
        theme: this.theme,
        content: `Invalid sub-process ID: ${id}`,
      });
      message.open();
    }
  }

  removeTab(index: number) {
    if (this.tabGroup.selectedIndex === index && this.tabs.length > 1) {
      if (index === this.tabs.length - 1) {
        this.tabComponents.get(index - 1)?.focus();
      } else {
        this.tabComponents.get(index + 1)?.focus();
      }
    }
    this.tabs.splice(index, 1);
  }

  addTab() {
    const nextIndex = this.tabs.length + 1;
    this.tabs.push({
      id: 'tab-' + nextIndex,
      title: 'Tab ' + nextIndex,
      graph: null
    });
    this.tabGroup.selectedIndex = this.tabs.length - 1;
  }
}
