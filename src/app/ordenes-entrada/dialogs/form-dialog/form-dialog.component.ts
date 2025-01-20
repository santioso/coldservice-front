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
import { OrdenesEntradaModel } from 'app/ordenes-entrada/ordenes-entrada.model';
import { OrdenesEntradaService } from 'app/ordenes-entrada/ordenes-entrada.service';
import { ActivoMaestroModel } from 'app/ordenes-entrada/activo-maestro.model';
import { UtilPopupService } from '@shared/services/util-popup.service';
import { ActivosService } from 'app/activos/activos.service';
import { ActivosModel } from 'app/activos/activos.model';

export interface DialogData {
  id: number;
  action: string;
  ordenesEntradaModel: OrdenesEntradaModel;
}

export interface activosEntrada {
  id: string;
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
  ordenesEntradaTableForm: UntypedFormGroup;
  ordenesEntradaModel: OrdenesEntradaModel;
  soloLectura: boolean;
  displayedColumns: string[] = ['id', 'descripcion', 'fabricante', 'capacidad', 'observaciones'];

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ordenesEntradaService: OrdenesEntradaService,
    private activosService: ActivosService,
    private readonly fb: UntypedFormBuilder,
    private utilPopupService: UtilPopupService,
  ) {
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = 'Orden de entrada de activos No. ' + data.ordenesEntradaModel.id;
      this.ordenesEntradaModel = data.ordenesEntradaModel;
      this.soloLectura = true;
    } else {
      this.dialogTitle = 'Nueva entrada';
      const blankObject = {} as OrdenesEntradaModel;
      this.ordenesEntradaModel = new OrdenesEntradaModel(blankObject);
      this.soloLectura = false;
    }
    this.ordenesEntradaTableForm = this.createContactForm();
  }

  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);

  ngOnInit(): void {
    this.ordenesEntradaTableForm = this.fb.group({
      id: [this.ordenesEntradaModel.id],
      fecha: [this.convertirFechaAObjetoDate(this.ordenesEntradaModel.fecha)],
      placa_vehiculo: [this.ordenesEntradaModel.placa_vehiculo, Validators.required],
      observaciones: [this.ordenesEntradaModel.observaciones],
      entrega: [this.ordenesEntradaModel.entrega],
      recibe: [this.ordenesEntradaModel.recibe],
      activosEntrada: this.fb.array([]) // Asegúrate de que este control esté definido
    });

    this.ordenesEntradaModel.activosEntrada ? this.setActivos(this.ordenesEntradaModel.activosEntrada) : this.agregarRegistrosFaltantes(this.activosEntrada)

  }

  get activosEntrada(): FormArray {
    return this.ordenesEntradaTableForm.get('activosEntrada') as FormArray;
  }

  setActivos(activos: any[]): void {
    const activosFormArray = this.ordenesEntradaTableForm.get('activosEntrada') as FormArray;
    activos.forEach((activo, index) => {
      if (activo && (activo.id || activo.descripcion || activo.fabricante || activo.capacidad || activo.observaciones)) {
        const activoFormGroup = this.fb.group({
          id: [activo.id],
          descripcion: [{ value: activo.descripcion }],
          fabricante: [{ value: activo.fabricante }],
          capacidad: [{ value: activo.capacidad }],
          observaciones: [{ value: activo.observaciones }]
        });
        activosFormArray.push(activoFormGroup);
      }
    });
    this.agregarRegistrosFaltantes(activosFormArray)
  }

  // Agregar registros faltantes hasta llegar a 10
  agregarRegistrosFaltantes(activosFormArray: FormArray) {
    const registrosFaltantes = 10 - activosFormArray.length;
    for (let i = 0; i < registrosFaltantes; i++) {
      const activoFormGroup = this.createActivo();
      activosFormArray.push(activoFormGroup);
    }
  }

  createActivo(): FormGroup {
    return this.fb.group({
      id: [''],
      descripcion: [''],
      capacidad: [''],
      fabricante: [''],
      cliente_id: [''],
      cliente: [''],
      establecimiento: [''],
      observaciones: ['']
    });
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

  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.ordenesEntradaModel.id],
      fecha: [this.convertirFechaAObjetoDate(this.ordenesEntradaModel.fecha), [Validators.required]],
      placa_vehiculo: [this.ordenesEntradaModel.placa_vehiculo],
      entrega: [this.ordenesEntradaModel.entrega, [Validators.required]],
      recibe: [this.ordenesEntradaModel.recibe, [Validators.required]],
      observaciones: [this.ordenesEntradaModel.observaciones]
    });
  }

  submit() {
    // emppty stuff
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    let datosForm = this.ordenesEntradaTableForm.getRawValue();
    datosForm.fecha = this.formatearFecha(datosForm.fecha);
    datosForm.activosEntrada = datosForm.activosEntrada.filter((activo: any) => {
      return Object.values(activo).some(value => value !== null && value !== '');
    });

    if (this.action === 'add') {
      this.ordenesEntradaService.addOrden(datosForm);
    } else {
      this.ordenesEntradaService.updateOrden(datosForm);
    }
  }

  onIdBlur(index: number): void {
    const idControl = this.activosEntrada.at(index).get('id');
    if (idControl && idControl.value !== '') {
      let value = idControl.value;
      if (this.verificarIdDuplicado(value, index)) {
        this.mostrarMensajeError(value, idControl);
        return;
      }
      if (value && value.length >= 3) {
        this.obtenerDatosDelServicio(value, index);
      }
    }
  }

  private verificarIdDuplicado(value: string, index: number): boolean {
    return this.activosEntrada.value.some((activo: any, i: number) => activo.id === value && i !== index);
  }

  private mostrarMensajeError(value: string, idControl: any): void {
    this.utilPopupService.mostrarMensaje(`La placa ${value} ya está en la orden de entrada, no se puede ingresar mas de una vez`, 'error', 'Placa duplicada', false);
    idControl.setValue('');
  }

  private obtenerDatosDelServicio(value: string, index: number): void {
    let activoFound=false;
    this.activosService.getActivoById(value).subscribe({
      next: (response: ActivosModel) => {
        if (!response) {
          activoFound = true;
          return;
        }
        const { id, descripcion, fabricante, capacidad, cliente_id, nombre_cliente, establecimiento_comercial } = response;
        const activoFormGroup = this.activosEntrada.at(index) as FormGroup;

        if (activoFormGroup.get('id')) {
          activoFormGroup.patchValue({
            id,
            descripcion,
            fabricante,
            capacidad,
          });
        } else {
          console.error('Algunos controles no existen en el FormGroup');
        }
      }
    })

    if(activoFound) return

    this.ordenesEntradaService.getMaestroActivoByPlaca(value).subscribe({
      next: (response: ActivoMaestroModel[]) => {
        if (!response || response.length === 0) {
          return;
        }
        const { id, descripcion, fabricante, capacidad, cliente_id, cliente, establecimiento } = response[0];
        const activoFormGroup = this.activosEntrada.at(index) as FormGroup;

        if (activoFormGroup.get('id')) {
          activoFormGroup.patchValue({
            id,
            descripcion,
            fabricante,
            capacidad,
          });
        } else {
          console.error('Algunos controles no existen en el FormGroup');
        }
      }
    });
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
