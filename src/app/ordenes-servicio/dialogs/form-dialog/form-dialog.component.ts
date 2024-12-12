import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormArray,
  FormGroup,
} from '@angular/forms';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { UtilPopupService } from '@shared/services/util-popup.service';
import { ActivosService } from 'app/activos/activos.service';
import { ActivosModel } from 'app/activos/activos.model';
import { CreateOrdenesServicioModel, OrdenesServicioModel } from 'app/ordenes-servicio/ordenes-servicio.model';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';

export interface DialogData {
  id: number;
  action: string;
  ordenesServicioModel: OrdenesServicioModel;
}

@Component({
  selector: 'app-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-CO' }],
})
export class FormDialogComponent implements OnInit {
  action: string;
  dialogTitle: string;
  ordenesServicioTableForm: UntypedFormGroup;
  ordenesServicioModel: OrdenesServicioModel;
  soloLectura: boolean;
  displayedColumns: string[] = ['dateStart', 'activoId', 'descripcion', 'capacidad', 'diagnosis', 'status', 'observaciones', 'actions'];

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ordenesServiceService: OrdenesServicioService,
    private activosService: ActivosService,
    private readonly fb: UntypedFormBuilder,
    private utilPopupService: UtilPopupService,
  ) {
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = 'Orden de servicio No. ' + data.ordenesServicioModel.id;
      this.ordenesServicioModel = data.ordenesServicioModel;
      this.soloLectura = true;
    } else {
      this.dialogTitle = 'Nueva orden de servicio';
      const blankObject = {} as OrdenesServicioModel;
      this.ordenesServicioModel = new OrdenesServicioModel(blankObject);
      this.soloLectura = false;
    }
    this.ordenesServicioTableForm = this.createForm();
  }

  formControl = new UntypedFormControl('', [
    // Validators.required,
    // Validators.email,
  ]);

  ngOnInit(): void {
    console.log('data', this.data)
  }

  getErrorMessage() {
    if (this.formControl.hasError('required')) {
      return 'Required field';
    } else if (this.formControl.hasError('email')) {
      return 'Not a valid email';
    } else {
      return '';
    }
  }

  createForm(): UntypedFormGroup {
    return this.fb.group({
        id: [this.ordenesServicioModel.id, this.ordenesServicioModel.id],
        dateStart: [this.convertirFechaAObjetoDate(this.ordenesServicioModel.dateStart)],
        activoId: [this.ordenesServicioModel.activoId],
        activo: [this.ordenesServicioModel.descripcion],
        diagnosis: [this.ordenesServicioModel.diagnosis, Validators.required],
        status: [this.ordenesServicioModel.status],
        capacidad: [this.ordenesServicioModel.capacidad],
        ordenEntradaId: [this.ordenesServicioModel.ordenEntradaId],
        observaciones: [this.ordenesServicioModel.observaciones],
      });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    let datosForm: CreateOrdenesServicioModel = {
      id: 0,
      date_start: new Date(),
      date_finish: null,
      diagnosis: '',
      activo_entrada_id: null
    };
    const datosFormulario = this.ordenesServicioTableForm.getRawValue();
    datosForm.id = this.ordenesServicioModel.id;
    datosForm.date_start = datosFormulario.dateStart;
    datosForm.date_finish = null;
    datosForm.diagnosis = datosFormulario.diagnosis;
    datosForm.activo_entrada_id = datosFormulario.activoId;

    if (this.action === 'add') {
      this.ordenesServiceService.addOrden(datosForm).subscribe({
        next: (resp) => {
          this.utilPopupService.mostrarMensaje('La orden de servicio se guardó correctamente', 'success', 'Orden de servicio guardada', false);
        },
        error: (err) => {
          this.utilPopupService.mostrarMensaje(err, 'error', 'Error al guardar', false);
        },
        complete: () => {
          this.dialogRef.close();
        },
      });
    }
    else {
      console.log(datosForm)
      this.ordenesServiceService.updateOrden(datosForm).subscribe({
        next: (resp) => {
          this.utilPopupService.mostrarMensaje('La orden de servicio se editó correctamente', 'success', 'Orden de servicio editada', false);
        },
        error: (err) => {
          this.utilPopupService.mostrarMensaje(err, 'error', 'Error al editar', false);
        },
        complete: () => {
          this.dialogRef.close();
        },
      });    
    }
  }







  private mostrarMensajeError(value: string, idControl: any): void {
    this.utilPopupService.mostrarMensaje(`La placa ${value} ya está en la orden de entrada, no se puede ingresar mas de una vez`, 'error', 'Placa duplicada', false);
    idControl.setValue('');
  }

  private formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Añadir cero si es necesario
    const day = ('0' + date.getDate()).slice(-2); // Añadir cero si es necesario
    return `${year}/${month}/${day}`;
  }

  private convertirFechaAObjetoDate(fecha: string): Date {
    const [year, month, day] = fecha.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
