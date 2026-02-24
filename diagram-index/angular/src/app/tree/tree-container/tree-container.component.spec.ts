import { TestBed } from '@angular/core/testing';
import { TreeContainerComponent } from './tree-container.component';

import type { ComponentFixture } from '@angular/core/testing';

describe('TabsContainerComponent', () => {
    let component: TreeContainerComponent;
    let fixture: ComponentFixture<TreeContainerComponent>;

    beforeEach(async() => {
        await TestBed.configureTestingModule({
            declarations: [ TreeContainerComponent ]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TreeContainerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
