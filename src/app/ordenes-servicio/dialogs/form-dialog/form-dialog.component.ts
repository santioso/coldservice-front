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
import { ActivesEntryModel, CreateOrdenesServicioModel, OrdenesServicioModel } from 'app/ordenes-servicio/ordenes-servicio.model';
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
  statusService: any = [];
  activosEntrada: any[] = [];

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
    Validators.required,
    // Validators.email,
  ]);

  ngOnInit(): void {
    console.log('data', this.data);
    this.loadActivosEntrada();
    this.loadStatus();
  }

  loadActivosEntrada(): void {
    this.ordenesServiceService.getActivesEntry().subscribe({
      next: (data) => {
        const activos = data;
        this.activosEntrada = activos.map((x) => {
          return { id: x.activo_entrada_id, descripcion: x.activo_id, value: x.descripcion };
        });
        console.log('this.activosEntrada', this.activosEntrada)
      },
    })
  }

  loadStatus(): void {
    this.ordenesServiceService.getStatus().subscribe({
      next: (data) => {
        const status = data;
        this.statusService = this.createArrayStatus(status);
      },
    })
  }

  createArrayStatus(status: any): Array<any> {
    this.statusService = status.map((x: any) => {
      return { id: x, value: x };
    });
    return this.statusService;
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
    console.log('this.ordenesServicioModel', this.ordenesServicioModel)
    return this.fb.group({
        id: [this.ordenesServicioModel.id, Validators.required],
        dateStart: [this.ordenesServicioModel.dateStart, Validators.required],
        activoEntradaId: [this.ordenesServicioModel.activoId, Validators.required],
        descripcion: [this.ordenesServicioModel.descripcion],
        diagnosis: [this.ordenesServicioModel.diagnosis, Validators.required],
        status: [this.ordenesServicioModel.status, Validators.required],
        capacidad: [this.ordenesServicioModel.capacidad],
        ordenEntradaId: [this.ordenesServicioModel.ordenEntradaId],
        observaciones: [this.ordenesServicioModel.observaciones],
      });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    const datosFormulario = this.ordenesServicioTableForm.getRawValue();
    console.log('datosFormulario  ', datosFormulario)
    let datosForm: CreateOrdenesServicioModel = {
      id: this.ordenesServicioModel.id,
      date_start: datosFormulario.dateStart,
      date_finish: null,
      diagnosis: datosFormulario.diagnosis,
      activo_entrada_id: datosFormulario.activoEntradaId,
    };

    if (this.action === 'add') {
      this.ordenesServiceService.addOrden(datosForm).subscribe({
        next: (resp) => {
          this.utilPopupService.mostrarMensaje('La orden de servicio se guardó correctamente', 'success', 'Orden de servicio guardada', false);
          this.dialogRef.close();
        },
        error: (err) => {
          this.utilPopupService.mostrarMensaje(err, 'error', 'Error al guardar', false);
        },
        complete: () => {
        },
      });
    }
    else {
      console.log(datosForm)
      this.ordenesServiceService.updateOrden(datosForm).subscribe({
        next: (resp) => {
          console.log('resp....', resp)
          this.utilPopupService.mostrarMensaje('La orden de servicio se editó correctamente', 'success', 'Orden de servicio editada', false);
          this.dialogRef.close();
        },
        error: (err) => {
          this.utilPopupService.mostrarMensaje(err, 'error', 'Error al editar', false);
        },
        complete: () => {

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
