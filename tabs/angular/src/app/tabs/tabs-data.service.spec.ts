import { TestBed } from '@angular/core/testing';

import { TabsDataService } from './tabs-data.service';

describe('TabsDataService', () => {
  let service: TabsDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TabsDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
