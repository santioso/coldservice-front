import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoreoTemperaturaComponent } from './monitoreo-temperatura/monitoreo-temperatura.component';

describe('MonitoreoTemperaturaComponent', () => {
  let component: MonitoreoTemperaturaComponent;
  let fixture: ComponentFixture<MonitoreoTemperaturaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MonitoreoTemperaturaComponent]
    });
    fixture = TestBed.createComponent(MonitoreoTemperaturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
