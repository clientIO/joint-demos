import { TestBed } from '@angular/core/testing';
import { TabComponent } from './tab.component';

import type { ComponentFixture } from '@angular/core/testing';

describe('TabComponent', () => {
    let component: TabComponent;
    let fixture: ComponentFixture<TabComponent>;

    beforeEach(async() => {
        await TestBed.configureTestingModule({
            declarations: [ TabComponent ]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TabComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
