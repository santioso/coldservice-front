import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdenesEntradaComponent } from './ordenes-entrada.component';


describe('OrdenesEntradaComponent', () => {
  let component: OrdenesEntradaComponent;
  let fixture: ComponentFixture<OrdenesEntradaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrdenesEntradaComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OrdenesEntradaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
