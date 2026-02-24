import { Component } from '@angular/core';

import type { AfterViewInit, OnInit } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
    public ngOnInit(): void {
    }

    public ngAfterViewInit(): void {
    }
}
