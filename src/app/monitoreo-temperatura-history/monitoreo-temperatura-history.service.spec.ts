import { TestBed } from '@angular/core/testing';

import { MonitoreoTemperaturaService } from './monitoreo-temperatura-history.service';

describe('MonitoreoTemperaturaService', () => {
  let service: MonitoreoTemperaturaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MonitoreoTemperaturaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
