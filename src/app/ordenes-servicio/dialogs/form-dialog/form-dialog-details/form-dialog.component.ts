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
import { OrdenesServicioModel } from 'app/ordenes-servicio/ordenes-servicio.model';
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
    public ordenesServicioService: OrdenesServicioService,
    private activosService: ActivosService,
    private readonly fb: UntypedFormBuilder,
    private utilPopupService: UtilPopupService,
  ) {
    this.action = data.action;
    console.log(data)
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
    this.ordenesServicioTableForm = this.createContactForm();
  }

  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);

  ngOnInit(): void {
    console.log('data', this.data)
    this.ordenesServicioTableForm = this.fb.group({
      id: [this.ordenesServicioModel.id],
      dateStart: [this.convertirFechaAObjetoDate(this.ordenesServicioModel.dateStart)],
      activoId: [this.ordenesServicioModel.activoId],
      descripcion: [this.ordenesServicioModel.descripcion],
      diagnosis: [this.ordenesServicioModel.diagnosis, Validators.required],
      status: [this.ordenesServicioModel.status],
      capacidad: [this.ordenesServicioModel.capacidad],
      ordenEntradaId: [this.ordenesServicioModel.ordenEntradaId],
      observaciones: [this.ordenesServicioModel.observaciones],
//      activosEntrada: this.fb.array([]) // Asegúrate de que este control esté definido
    });


    // Suponiendo que tienes un objeto `ordenesEntrada` con los datos
  //  this.ordenesServicioModel.activosEntrada ? this.setActivos(this.ordenesServicioModel.activosEntrada) : this.agregarRegistrosFaltantes(this.activosEntrada)

  }

  // get activosEntrada(): FormArray {
  //   return this.ordenesServicioTableForm.get('activosEntrada') as FormArray;
  // }

  // setActivos(activos: any[]): void {
  //   const activosFormArray = this.ordenesServicioTableForm.get('activosEntrada') as FormArray;
  //   activos.forEach((activo, index) => {
  //     if (activo && (activo.id || activo.descripcion || activo.fabricante || activo.capacidad || activo.observaciones)) {
  //       const activoFormGroup = this.fb.group({
  //         id: [activo.id],
  //         descripcion: [activo.descripcion],
  //         fabricante: [activo.fabricante],
  //         capacidad: [activo.capacidad],
  //         observaciones: [activo.observaciones]
  //       });
  //       activosFormArray.push(activoFormGroup);
  //     }
  //   });
  //   this.agregarRegistrosFaltantes(activosFormArray)
  // }


  // createActivo(): FormGroup {
  //   return this.fb.group({
  //     id: [''],
  //     descripcion: [''],
  //     capacidad: [''],
  //     fabricante: [''],
  //     cliente_id: [''],
  //     cliente: [''],
  //     establecimiento: [''],
  //     observaciones: ['']
  //   });
  // }

  getErrorMessage() {
    if (this.formControl.hasError('required')) {
      return 'Required field';
    } else if (this.formControl.hasError('email')) {
      return 'Not a valid email';
    } else {
      return '';
    }
  }

  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.ordenesServicioModel.id],
      dateStart: [this.convertirFechaAObjetoDate(this.ordenesServicioModel.dateStart)],
      diagnosis: [this.ordenesServicioModel.diagnosis, Validators.required],
      status: [this.ordenesServicioModel.status],
      capacidad: [this.ordenesServicioModel.capacidad],
      ordenEntradaId: [this.ordenesServicioModel.ordenEntradaId],
      observaciones: [this.ordenesServicioModel.observaciones],
    });
  }

  submit() {
    // emppty stuff
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    let datosForm = this.ordenesServicioTableForm.getRawValue();
    datosForm.fecha = this.formatearFecha(datosForm.fecha);
    datosForm.activosEntrada = datosForm.activosEntrada.filter((activo: any) => {
      return Object.values(activo).some(value => value !== null && value !== '');
    });

    // if (this.action === 'add') {
    //   this.ordenesServicioService.addOrden(datosForm);
    // } else {
    //   this.ordenesServicioService.updateOrden(datosForm);
    // }
  }

  // onIdBlur(index: number): void {
  //   const idControl = this.activosEntrada.at(index).get('id');
  //   if (idControl && idControl.value !== '') {
  //     let value = idControl.value;
  //     if (this.verificarIdDuplicado(value, index)) {
  //       this.mostrarMensajeError(value, idControl);
  //       return;
  //     }
  //     if (value && value.length >= 3) {
  //       this.obtenerDatosDelServicio(value, index);
  //     }
  //   }
  // }



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
