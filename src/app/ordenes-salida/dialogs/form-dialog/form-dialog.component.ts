import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
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
import { catchError, lastValueFrom, map, Observable, startWith, throwError } from 'rxjs';
import { TechnicalInterface } from 'app/ordenes-servicio/dialogs/form-dialog/form-dialog-details/add-detail-dialog/add-detail-dialog.model';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';

export interface DialogData {
  id: number;
  action: string;
  ordenesSalidaModel: OrdenesSalidaModel;
}

export interface activosSalida {
  idActivo: string;
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
  activosEnOrdenEntrada: ActivosEnOrdenEntradaInterface[] = [];
  filteredActivos: ActivosEnOrdenEntradaInterface[] = [];
  displayedColumns: string[] = ['idActivo', 'descripcion', 'observaciones'];
  technicalOptions: TechnicalInterface[] = [];

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ordenesSalidaService: OrdenesSalidaService,
    private ordenesServicioService: OrdenesServicioService,
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
    this.ordenesServicioService
      .getTechnicals()
      .subscribe((technicals: TechnicalInterface[]) => {
        this.technicalOptions = technicals;
      });
    
    this.ordenesSalidaService.getAllActivosOrdenesEntrada().subscribe(
      (activos) => {
        this.activosEnOrdenEntrada = activos;
        this.filteredActivos = [...activos]; // Inicializamos con todos los activos
        
        this.ordenesSalidaTableForm = this.creaSalidaTableForm();
        this.getInformationActivos();
      },
      (error) => {
        console.error('Error al obtener los activos en orden de entrada:', error);
      }
    );
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
          entrega: parseInt(this.ordenesSalidaModel.entrega),
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
      fecha: [this.convertirFechaAObjetoDate(this.ordenesSalidaModel.fecha), Validators.required,],
      placa_vehiculo: [this.ordenesSalidaModel.placa_vehiculo, Validators.required,],
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
    const activosFormArray = this.ordenesSalidaTableForm.get('activosSalida') as FormArray;
    activos.forEach((activo, index) => {
      const activoFormGroup = this.createActivo(activo);
      activosFormArray.push(activoFormGroup);
      activoFormGroup.get('idActivo')?.setValue(activo.idActivo || '');
    });
    this.agregarRegistrosFaltantes(activosFormArray);
  }

  createActivo(activo: any = {}): FormGroup {
    return this.fb.group({
      idActivo: [activo.idActivo || ''],
      descripcion: [activo.descripcion || ''],
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

  private _filterActivos(value: string): ActivosEnOrdenEntradaInterface[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return this.activosEnOrdenEntrada.filter(activo =>
      activo.idActivo.toLowerCase().includes(filterValue)
    );
  }

  displayActivo(activo: any): string {
    if (!activo) return '';
    
    // Si es un string, lo devolvemos directamente
    if (typeof activo === 'string') return activo;
    
    // Si es un objeto con idActivo, devolvemos ese valor
    if (activo.idActivo) return activo.idActivo;
    
    // En cualquier otro caso, devolvemos cadena vacía
    return '';
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

    // Filtrar activos que tengan idEntrada y mapear correctamente
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

  onActivoEntradaIdChange(event: any, index: number): void {
    const activo = event.option.value;
    if (activo && activo.idActivo) {
      // Verificamos si el idEntrada ya está en la orden de salida
      if (activo.idEntrada !== undefined && this.verificarIdDuplicado(activo.idEntrada)) {
        // Mostramos el mensaje de error
        this.mostrarMensajeError(activo.idActivo);
        
        // Limpiamos el campo de activo
        const activoFormGroup = this.activosSalida.at(index) as FormGroup;
        activoFormGroup.patchValue({
          idActivo: '',
          descripcion: '',
          observaciones: '',
          idEntrada: '',
        });
        
        // Actualizamos la lista de activos filtrados
        this.actualizarActivosFiltrados();
        
        return;
      }
      this.obtenerDatosDelServicio(activo.idActivo, index);
    }
  }

  private verificarIdDuplicado(idEntrada: number): boolean {
    return this.activosSalida.value.some(
      (activo: any) => activo.idEntrada === idEntrada
    );
  }

  private mostrarMensajeError(idActivo: string): void {
    this.utilPopupService.mostrarMensaje(
      `La placa ${idActivo} ya está en la orden de salida, no se puede ingresar más de una vez`,
      'error',
      'Placa duplicada',
      false
    );
  }

  private obtenerDatosDelServicio(idActivo: string, index: number): void {
    const activo = this.activosEnOrdenEntrada?.find(
      (activo) => activo.idActivo === idActivo
    );
    if (activo) {
      const activoFormGroup = this.activosSalida.at(index) as FormGroup;
      activoFormGroup.patchValue({
        idActivo: activo.idActivo,
        descripcion: activo.descripcion,
        observaciones: activo.observaciones,
        idEntrada: activo.idEntrada,
      });
      this.activoValid = this.activosSalida.length >= 1;
      
      // Actualizamos la lista de activos filtrados para excluir el que acabamos de seleccionar
      this.actualizarActivosFiltrados();
    }
  }

  private actualizarActivosFiltrados(): void {
    // Obtenemos los IDs de entrada que ya están seleccionados
    const idsEntradaSeleccionados = this.activosSalida.value
      .filter((activo: any) => activo.idEntrada)
      .map((activo: any) => activo.idEntrada);
    
    // Filtramos para excluir los activos que ya están en la orden de salida
    this.filteredActivos = this.activosEnOrdenEntrada.filter(activo => 
      !idsEntradaSeleccionados.includes(activo.idEntrada)
    );
  }

  filtrarActivos(event: any, index: number): void {
    const filterValue = event.target.value.toLowerCase();
    
    // Primero actualizamos la lista completa de activos disponibles (excluyendo los ya seleccionados)
    this.actualizarActivosFiltrados();
    
    // Luego filtramos por el texto ingresado
    if (filterValue) {
      this.filteredActivos = this.filteredActivos.filter(activo =>
        activo.idActivo.toLowerCase().includes(filterValue)
      );
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
