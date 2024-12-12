import { TestBed } from '@angular/core/testing';

import { OrdenesServicioService } from './ordenes-servicio.service';

describe('OrdenesServicioService', () => {
  let service: OrdenesServicioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrdenesServicioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
