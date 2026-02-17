import { AfterViewInit, OnInit, Component } from '@angular/core';

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
