import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ActivosEnOrdenEntradaInterface,
  OrdenesSalidaModel,
} from '../../ordenes-salida.model';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { ActivosService } from 'app/activos/activos.service';
import { OrdenesSalidaService } from 'app/ordenes-salida/ordenes-salida.service';
import { UtilPopupService } from '@shared/services/util-popup.service';
import { ActivosModel } from 'app/activos/activos.model';
import { ActivoMaestroModel } from 'app/ordenes-entrada/activo-maestro.model';
import { catchError, lastValueFrom, Observable, throwError } from 'rxjs';

export interface DialogData {
  id: number;
  action: string;
  ordenesSalidaModel: OrdenesSalidaModel;
}

export interface activosSalida {
  idEntrada: string;
  descripcion: string;
  fabricante: string;
  capacidad: string;
  observaciones: string;
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
  ordenesSalidaTableForm: FormGroup;
  blankObject = {} as OrdenesSalidaModel;
  ordenesSalidaModel: OrdenesSalidaModel = new OrdenesSalidaModel(
    this.blankObject
  );
  soloLectura: boolean;
  activoValid: boolean = false;
  activosEnOrdenEntrada?: ActivosEnOrdenEntradaInterface[];
  displayedColumns: string[] = [
    'id',
    'descripcion',
    'fabricante',
    'capacidad',
    'observaciones',
  ];

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ordenesSalidaService: OrdenesSalidaService,
    private activosService: ActivosService,
    private readonly fb: UntypedFormBuilder,
    private utilPopupService: UtilPopupService
  ) {
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = 'Orden de salida de activos No. ' + data.ordenesSalidaModel.id;
    //  this.getOrderWithActivosById(data.ordenesSalidaModel.id);
      this.soloLectura = true;
    } else {
      this.dialogTitle = 'Nueva orden de salida';
      this.ordenesSalidaModel = new OrdenesSalidaModel(this.blankObject);
      this.soloLectura = false;
    }
    this.ordenesSalidaTableForm = this.createContactForm();
  }

  ngOnInit(): void {
    this.getActivosEnOrdenEntrada();
    this.ordenesSalidaTableForm = this.creaSalidaTableForm();
    this.getInformationActivos();
  }

  getInformationActivos(): void {
    if (this.action === 'edit') {
      this.getOrderWithActivosById(this.data.ordenesSalidaModel.id).subscribe((orden) => {
        this.ordenesSalidaModel = orden;
        this.ordenesSalidaTableForm.patchValue({
          id: this.ordenesSalidaModel.id,
          fecha: this.convertirFechaAObjetoDate(this.ordenesSalidaModel.fecha),
          placa_vehiculo: this.ordenesSalidaModel.placa_vehiculo,
          observaciones: this.ordenesSalidaModel.observaciones,
          entrega: this.ordenesSalidaModel.entrega,
          recibe: this.ordenesSalidaModel.recibe,
        });

        if (this.ordenesSalidaModel.activosSalida) {
          this.setActivos(this.ordenesSalidaModel.activosSalida);
          this.activosEnOrdenEntrada = [
            ...(this.activosEnOrdenEntrada || []),
            ...this.ordenesSalidaModel.activosSalida.map((activo: any) => ({
              idEntrada: activo.idEntrada,
              service_order_id: this.data.ordenesSalidaModel.id,
              observaciones: activo.observaciones,
              idActivo: activo.idActivo,
              descripcion: activo.descripcion,
              fabricante: activo.fabricante,
              capacidad: activo.capacidad,
            }))
          ];
        }
        });
    } else {
      this.ordenesSalidaModel.activosSalida
        ? this.setActivos(this.ordenesSalidaModel.activosSalida)
        : this.agregarRegistrosFaltantes(this.activosSalida);
    }
  }

  creaSalidaTableForm() {
    return this.fb.group({
      id: [this.ordenesSalidaModel.id],
      fecha: [
        this.convertirFechaAObjetoDate(this.ordenesSalidaModel.fecha),
        Validators.required,
      ],
      placa_vehiculo: [
        this.ordenesSalidaModel.placa_vehiculo,
        Validators.required,
      ],
      observaciones: [this.ordenesSalidaModel.observaciones],
      entrega: [this.ordenesSalidaModel.entrega, Validators.required],
      recibe: [this.ordenesSalidaModel.recibe, Validators.required],
      idEntrada: [this.ordenesSalidaModel.idEntrada],
      activosSalida: this.fb.array([]),
    });
  }

  get activosSalida(): FormArray {
    return this.ordenesSalidaTableForm.get('activosSalida') as FormArray;
  }

  setActivos(activos: any[]): void {
    const activosFormArray = this.ordenesSalidaTableForm.get(
      'activosSalida'
    ) as FormArray;
    activos.forEach((activo) => {
      activosFormArray.push(this.createActivo(activo));
    });
    this.agregarRegistrosFaltantes(activosFormArray);
  }

  createActivo(activo: any = {}): FormGroup {
    return this.fb.group({
      id: [activo.id || ''],
      descripcion: [activo.descripcion || ''],
      fabricante: [activo.fabricante || ''],
      capacidad: [activo.capacidad || ''],
      observaciones: [activo.observaciones || ''],
      idEntrada: [activo.idEntrada || ''],
    });
  }

  async getActivosEnOrdenEntrada(): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.ordenesSalidaService.getAllActivosOrdenesEntrada()
      );
      this.activosEnOrdenEntrada = response;
    } catch (error) {
      console.error('Error al obtener los activos en orden de entrada:', error);
    }
  }

  getOrderWithActivosById(id: number): Observable<OrdenesSalidaModel> {
    return this.ordenesSalidaService.getOrdenById(id).pipe(
      catchError((error) => {
        console.error('Error al obtener la orden de salida por ID:', error);
        return throwError(() => error);
      })
    );
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  // Agregar registros faltantes hasta llegar a 10
  agregarRegistrosFaltantes(activosFormArray: FormArray) {
    const registrosFaltantes = 10 - activosFormArray.length;
    for (let i = 0; i < registrosFaltantes; i++) {
      const activoFormGroup = this.createActivo();
      activosFormArray.push(activoFormGroup);
    }
  }

  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.ordenesSalidaModel.id],
      fecha: [
        this.convertirFechaAObjetoDate(this.ordenesSalidaModel.fecha),
        [Validators.required],
      ],
      placa_vehiculo: [
        this.ordenesSalidaModel.placa_vehiculo,
        Validators.required,
      ],
      entrega: [this.ordenesSalidaModel.entrega, [Validators.required]],
      recibe: [this.ordenesSalidaModel.recibe, [Validators.required]],
      observaciones: [this.ordenesSalidaModel.observaciones],
    });
  }

  public confirmAdd(): void {
    let datosForm = this.ordenesSalidaTableForm.getRawValue();
    delete datosForm.id;
    delete datosForm.idEntrada;
    datosForm.fecha = this.formatearFecha(datosForm.fecha);
    datosForm.activosSalida = datosForm.activosSalida
      .filter((activo: any) => activo.idEntrada)
      .map((activo: any) => activo.idEntrada);

    if (this.action === 'add') {
      this.ordenesSalidaService.addOrden(datosForm).subscribe(() => {
        this.utilPopupService.mostrarMensaje(
          'La orden de salida se guardó correctamente',
          'success',
          'Orden de salida guardada',
          false
        );
        this.dialogRef.close(1);
      });
    } else if (this.action === 'edit') {
      this.ordenesSalidaService.updateOrden(datosForm, this.data.ordenesSalidaModel.id).subscribe(() => {
        this.utilPopupService.mostrarMensaje(
          'La orden de salida se actualizó correctamente',
          'success',
          'Orden de salida actualizada',
          false
        );
        this.dialogRef.close(1);
      });
    }
  }

  onIdBlur(index: number): void {
    const idControl = this.activosSalida.at(index).get('idEntrada');
    if (idControl && idControl.value !== '') {
      let value = idControl.value;
      if (this.verificarIdDuplicado(value, index)) {
        this.mostrarMensajeError(value, idControl);
        return;
      }
      this.obtenerDatosDelServicio(value, index);
    }
  }

  private verificarIdDuplicado(value: string, index: number): boolean {
    return this.activosSalida.value.some(
      (activo: any, i: number) => activo.idEntrada === value && i !== index
    );
  }

  private mostrarMensajeError(value: string, idControl: any): void {
    this.utilPopupService.mostrarMensaje(
      `La placa ${value} ya está en la orden de salida, no se puede ingresar más de una vez`,
      'error',
      'Placa duplicada',
      false
    );
    idControl.setValue('');
  }

  private obtenerDatosDelServicio(value: string, index: number): void {
    const activo = this.activosEnOrdenEntrada?.find(
      (activo) => activo.idEntrada === Number(value)
    );
    if (activo) {
      const activoFormGroup = this.activosSalida.at(index) as FormGroup;
      activoFormGroup.patchValue({
        id: activo.idEntrada,
        descripcion: activo.descripcion,
        fabricante: activo.fabricante,
        capacidad: activo.capacidad,
        observaciones: activo.observaciones,
      });
      this.activoValid = this.activosSalida.length >= 1;
    }
  }

  private formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Añadir cero si es necesario
    const day = ('0' + date.getDate()).slice(-2); // Añadir cero si es necesario
    return `${year}-${month}-${day}`;
  }

  private convertirFechaAObjetoDate(fecha: string): Date {
    const [year, month, day] = fecha.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
