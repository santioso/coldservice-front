import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormDialogDetailsComponent } from './form-dialog.component';

describe('FormDialogComponent', () => {
  let component: FormDialogDetailsComponent;
  let fixture: ComponentFixture<FormDialogDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormDialogDetailsComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FormDialogDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
