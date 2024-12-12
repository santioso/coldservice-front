import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdenesServicioComponent } from './ordenes-servicio.component';

describe('OrdenesServicioComponent', () => {
  let component: OrdenesServicioComponent;
  let fixture: ComponentFixture<OrdenesServicioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OrdenesServicioComponent]
    });
    fixture = TestBed.createComponent(OrdenesServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
