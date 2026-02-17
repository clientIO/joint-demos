import { AfterViewInit, OnInit, Component, ElementRef, ViewChild } from '@angular/core';

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
