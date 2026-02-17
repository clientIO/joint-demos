import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabsContainerComponent } from './tabs-container.component';

describe('TabsContainerComponent', () => {
  let component: TabsContainerComponent;
  let fixture: ComponentFixture<TabsContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TabsContainerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
