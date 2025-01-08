import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
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
import { OrdenesServicioModel } from 'app/ordenes-servicio/ordenes-servicio.model';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';
import { AddDetailDialogComponent } from './add-detail-dialog/add-detail-dialog.component';
import { SelectionModel } from '@angular/cdk/collections';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Direction } from '@angular/cdk/bidi';
import {
  DetailOrderServiceModel,
  TechnicalInterface,
} from './add-detail-dialog/add-detail-dialog.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatMenuTrigger } from '@angular/material/menu';
import { DeleteDialogDetailComponent } from './delete/delete.component';

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
export class FormDialogDetailsComponent implements OnInit {
  action: string;
  dialogTitle: string;
  ordenesServicioTableForm: UntypedFormGroup;
  ordenesServicioModel: OrdenesServicioModel;
  detailOrdenesServicio: DetailOrderServiceModel[] = [];
  soloLectura: boolean;
  subs: any = {};
  displayedColumns: string[] = [
    'id',
    'created_at',
    'status',
    'observaciones',
    'technical',
    'actions',
  ];
  dataSource = new MatTableDataSource<DetailOrderServiceModel>();
  selection = new SelectionModel<DetailOrderServiceModel>(true, []);

  dateStartLabel = '';
  activoIdLabel = '';
  descripcionLabel = '';
  diagnosisLabel = '';
  statusLabel = '';
  capacidadLabel = 0;
  ordenEntradaIdLabel = 0;
  observacionesLabel = '';

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  formControl = new UntypedFormControl('', [Validators.required]);

  constructor(
    public dialogRef: MatDialogRef<FormDialogDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public dialog: MatDialog,
    public ordenesServicioService: OrdenesServicioService,
    private activosService: ActivosService,
    private readonly fb: UntypedFormBuilder,
    private utilPopupService: UtilPopupService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle =
        'Orden de servicio No. ' + data.ordenesServicioModel.id;
      this.ordenesServicioModel = data.ordenesServicioModel;
      this.soloLectura = true;
    } else {
      this.dialogTitle = 'Nueva orden de servicio';
      const blankObject = {} as OrdenesServicioModel;
      this.ordenesServicioModel = new OrdenesServicioModel(blankObject);
      this.soloLectura = false;
    }
    this.ordenesServicioTableForm = this.createForm();
    console.log('data', data);
  }

  ngOnInit(): void {
    this.ordenesServicioTableForm = this.createForm();
    this.loadVariables();

    // Llenar el FormArray con los datos de details
    if (Array.isArray(this.ordenesServicioModel.details)) {
      console.log('this.ordenesServicioModel.details', this.ordenesServicioModel.details)
      this.setDetails(this.ordenesServicioModel.details);
    } else {
      console.error(
        'Expected details to be an array, but got:',
        this.ordenesServicioModel.details
      );
    }

    // Asignar el FormArray al dataSource
    this.dataSource.data = this.details.controls.map(
      (control) => control.value as DetailOrderServiceModel
    );
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  createForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.ordenesServicioModel.id],
      dateStart: [
        this.convertirFechaAObjetoDate(this.ordenesServicioModel.dateStart),
      ],
      activoId: [this.ordenesServicioModel.activoId],
      descripcion: [this.ordenesServicioModel.descripcion],
      diagnosis: [this.ordenesServicioModel.diagnosis, Validators.required],
      status: [this.ordenesServicioModel.status],
      capacidad: [this.ordenesServicioModel.capacidad],
      ordenEntradaId: [this.ordenesServicioModel.ordenEntradaId],
      observaciones: [this.ordenesServicioModel.observaciones],
      details: this.fb.array([]),
    });
  }

  get details(): FormArray {
    return this.ordenesServicioTableForm.get('details') as FormArray;
  }

  setDetails(details: any[]): void {
    console.log('details', details)
    if (Array.isArray(details)) {
      const detailsFormArray = this.details;
      details.forEach((detalle) => {
        detailsFormArray.push(this.createDetailFormGroup(detalle));
      });
    } else {
      console.error('Expected details to be an array, but got:', details);
    }
  }

  createDetailFormGroup(detalle: any): FormGroup {
    return this.fb.group({
      id: [detalle.id],
      created_at: [detalle.created_at],
      status: [detalle.status],
      observaciones: [detalle.observaciones],
      technical: [detalle.technicals[0]?.name],
    });
  }

  loadVariables() {
    this.dateStartLabel = this.ordenesServicioModel.dateStart.slice(0, 10);
    this.activoIdLabel = this.ordenesServicioModel.activoId;
    this.descripcionLabel = this.ordenesServicioModel.descripcion;
    this.diagnosisLabel = this.ordenesServicioModel.diagnosis;
    this.statusLabel = this.ordenesServicioModel.status;
    this.capacidadLabel = this.ordenesServicioModel.capacidad;
    this.ordenEntradaIdLabel = this.ordenesServicioModel.ordenEntradaId;
    this.observacionesLabel = this.ordenesServicioModel.observaciones;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSaveClick(): void {
    if (this.ordenesServicioTableForm.valid) {
      this.dialogRef.close(this.ordenesServicioTableForm.value);
    }
  }

  addDetail() {
    const dialogRef = this.dialog.open(AddDetailDialogComponent, {
      width: '400px',
      data: { serviceOrderId: this.ordenesServicioModel.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ordenesServicioService
          .addServiceOrderDetail(result)
          .subscribe((response) => {
            // Manejar la respuesta del servicio
            console.log('Detalle agregado:', response);
            this.addDetailToForm(response);
          });
      }
    });
  }

  addDetailToForm(detail: DetailOrderServiceModel): void {
    const detailsFormArray = this.details;
    detailsFormArray.push(this.createDetailFormGroup(detail));
    this.dataSource.data = detailsFormArray.controls.map(
      (control) => control.value as DetailOrderServiceModel
    );
  }

  editDetail(row: any) {
    console.log('index', row)
    const dialogRef = this.dialog.open(AddDetailDialogComponent, {
      width: '400px',
      data: { detail: row, serviceOrderId: this.ordenesServicioModel.id }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ordenesServicioService
          .updateServiceOrderDetail(result.id, result)
          .subscribe((response) => {
            // Manejar la respuesta del servicio
            console.log('Detalle actualizado:', response);
            this.updateDetailInForm(row, response);
          });
      }
    });
  }

  updateDetailInForm(row: any, detail: DetailOrderServiceModel): void {
    const index = this.details.controls.findIndex(control => control.value.id === row.id);
    if (index !== -1) {
      this.details.at(index).patchValue(detail);
      this.dataSource.data = this.details.controls.map(control => control.value as DetailOrderServiceModel);
    }
  }

  deleteDetail(row: any): void {
      const id = row.id;
      let tempDirection: Direction;
      if (localStorage.getItem('isRtl') === 'true') {
        tempDirection = 'rtl';
      } else {
        tempDirection = 'ltr';
      }
      const dialogRef = this.dialog.open(DeleteDialogDetailComponent, {
        data: row,
        direction: tempDirection,
      });
      this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
        if(result) {
              this.deleteDetailFromForm(row);
        }
        console.log(result)
      });
    }

    deleteDetailFromForm(row: any): void {
      const index = this.details.controls.findIndex(control => control.value.id === row.id);
      if (index !== -1) {
        this.details.removeAt(index);
        this.dataSource.data = this.details.controls.map(control => control.value as DetailOrderServiceModel);
      }
    }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  onIdBlur(index: number): void {
    // const idControl = this.ordenesServicioService.detail .at(index).get('id');
    // if (idControl && idControl.value !== '') {
    //   let value = idControl.value;
    //   if (this.verificarIdDuplicado(value, index)) {
    //     this.mostrarMensajeError(value, idControl);
    //     return;
    //   }
    //   if (value && value.length >= 3) {
    //    // this.obtenerDatosDelServicio(value, index);
    //   }
    // }
  }

  private mostrarMensajeError(value: string, idControl: any): void {
    this.utilPopupService.mostrarMensaje(
      `La placa ${value} ya está en la orden de entrada, no se puede ingresar mas de una vez`,
      'error',
      'Placa duplicada',
      false
    );
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
