import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
} from '@angular/forms';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { ActivosModel } from 'app/activos/activos.model';
import { ActivosService } from 'app/activos/activos.service';

export interface DialogData {
  id: string;
  action: string;
  activosModel: ActivosModel;
}

@Component({
  selector: 'app-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-CO' }],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  activosTableForm: UntypedFormGroup;
  activosModel: ActivosModel;
  soloLectura: boolean;

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public activosService: ActivosService,
    private readonly fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle =
        data.activosModel.id + ' - ' + data.activosModel.descripcion;
      this.activosModel = data.activosModel;
      this.soloLectura = true
    } else {
      this.dialogTitle = 'Nuevo activo';
      const blankObject = {} as ActivosModel;
      this.activosModel = new ActivosModel(blankObject);
      this.soloLectura = false
    }
    this.activosTableForm = this.createContactForm();
  }

  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);

  ngOnInit(): void {
    this.activosTableForm = this.createContactForm();
  }

  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
      ? 'Not a valid email'
      : '';
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.activosModel.id],
      descripcion: [this.activosModel.descripcion, [Validators.required]],
      fabricante: [this.activosModel.fabricante, [Validators.required]],
      capacidad: [this.activosModel.capacidad, [Validators.required]],
    });
  }

  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    this.activosService.addActivos(
      this.activosTableForm.getRawValue()
    );
  }


}
