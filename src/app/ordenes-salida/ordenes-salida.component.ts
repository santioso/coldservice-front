import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OrdenesSalidaService } from './ordenes-salida.service';
import { OrdenesSalidaModel } from './ordenes-salida.model';
import { UtilPopupService } from '../shared/services/util-popup.service';
import { DeleteDialogComponent } from './dialogs/delete/delete-dialog.component';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  TableElement,
  TableExportUtil,
  UnsubscribeOnDestroyAdapter,
} from '@shared';
import { DataSource, SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatMenuTrigger } from '@angular/material/menu';
import { BehaviorSubject, fromEvent, map, merge, Observable } from 'rxjs';
import { Direction } from '@angular/cdk/bidi';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { Action } from 'rxjs/internal/scheduler/Action';
import { OrdenesEntradaService } from 'app/ordenes-entrada/ordenes-entrada.service';

@Component({
  selector: 'app-ordenes-salida',
  templateUrl: './ordenes-salida.component.html',
  styleUrls: ['./ordenes-salida.component.scss'],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-CO',
    },
  ],
})
export class OrdenesSalidaComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  displayedColumns = [
    'select',
    'id',
    'fecha',
    'cantidad_activos',
    'placa_vehiculo',
    'observaciones',
    'entrega',
    'recibe',
    'actions',
  ];
  exampleDatabase?: OrdenesSalidaService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<OrdenesSalidaModel>(true, []);
  id?: number;
  ordenesSalidaModel?: OrdenesSalidaModel;
  ordenesSalida: OrdenesSalidaModel[] = [];

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public ordenesSalidaService: OrdenesSalidaService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly utilPopupService: UtilPopupService
  ) {
    super();
  }
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;
  @ViewChild(MatMenuTrigger)
  contextMenu?: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  ngOnInit(): void {
    this.loadData();
    this.loadOrdenesSalida();
  }

  refresh() {
    this.loadData();
  }

  loadOrdenesSalida(): void {
    this.ordenesSalidaService.fetchData();
    this.ordenesSalidaService.dataChange.subscribe(
      (data: OrdenesSalidaModel[]) => {
        this.ordenesSalida = data;
        this.cdr.detectChanges();
      }
    );
  }

  loadData() {
    this.exampleDatabase = this.ordenesSalidaService;
    this.dataSource = new ExampleDataSource(
      this.exampleDatabase,
      this.paginator,
      this.sort
    );
    this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(
      () => {
        if (!this.dataSource) {
          return;
        }
        this.dataSource.filter = this.filter.nativeElement.value;
      }
    );
    this.loadOrdenesSalida();
  }

  addNew() {
    let tempDirection: Direction = 'ltr';
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        ordenesSalidaModel: this.ordenesSalidaModel,
        action: 'add',
      },
      direction: tempDirection,
      width: '80%',
      height: '95%',
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        this.loadData();
      }
    });
  }

  editCall(row: OrdenesSalidaModel): void {
    let tempDirection: Direction = 'ltr';
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        ordenesSalidaModel: row,
        action: 'edit',
      },
      direction: tempDirection,
      width: '80%',
      height: '95%',
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        this.loadData();
      }
    });
  }

  deleteItem(row: OrdenesSalidaModel): void {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      data: row,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirm') {
        this.ordenesSalidaService.deleteOrden(row.id).subscribe(() => {
          this.loadData();
          this.utilPopupService.mostrarMensaje(
            `La orden de salida número ${row.id} se eliminó correctamente`,
            'success',
            'Orden de salida eliminada',
            false
          );
        });
      }
    });
  }

  printOrder(row: OrdenesSalidaModel): void {
    this.ordenesSalidaService.printOrder(row.id).subscribe({
      next: (response: HttpResponse<Blob>) => {
        if (response.body) {
          const blob = new Blob([response.body], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          window.URL.revokeObjectURL(url);
        } else {
          console.error('La respuesta no contiene un cuerpo válido.');
          this.utilPopupService.mostrarMensaje(
            'Hubo un problema al imprimir la orden',
            'error',
            'Error de impresión',
            false
          );
        }
      },
      error: (error) => {
        console.error('Error al imprimir la orden:', error);
        this.utilPopupService.mostrarMensaje(
          'Hubo un problema al imprimir la orden',
          'error',
          'Error de impresión',
          false
        );
      },
    });
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.renderedData.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.renderedData.forEach((row) =>
          this.selection.select(row)
        );
  }

  removeSelectedRows() {}

  // export table data in excel file
  exportExcel() {
    // key name with space add in brackets
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        Id: x.id,
        Fecha: x.fecha,
        'Cantidad de activos': x.cantidad_activos,
        'Placa vehiculo': x.placa_vehiculo,
        Observaciones: x.observaciones,
        Entrega: x.entrega,
        Recibe: x.recibe,
      }));

    TableExportUtil.exportToExcel(exportData, 'excel');
  }

  // context menu
  onContextMenu(event: MouseEvent, item: OrdenesSalidaModel) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    if (this.contextMenu?.menu) {
      this.contextMenu.menuData = { item: item };
      this.contextMenu.menu.focusFirstItem('mouse');
      this.contextMenu.openMenu();
    }
  }
}

export class ExampleDataSource extends DataSource<OrdenesSalidaModel> {
  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }
  filteredData: OrdenesSalidaModel[] = [];
  renderedData: OrdenesSalidaModel[] = [];
  constructor(
    public exampleDatabase: OrdenesSalidaService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }
  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<OrdenesSalidaModel[]> {
    // Listen for any changes in the base data, sorting, filtering, or pagination
    const displayDataChanges = [
      this.exampleDatabase.dataChange,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];
    this.exampleDatabase.getAllOrdenes();
    return merge(...displayDataChanges).pipe(
      map(() => {
        // Filter data
        this.filteredData = this.exampleDatabase.data
          .slice()
          .filter((ordenesSalidaModel: OrdenesSalidaModel) => {
            const searchStr = (
              ordenesSalidaModel.id +
              ordenesSalidaModel.fecha +
              ordenesSalidaModel.placa_vehiculo +
              ordenesSalidaModel.observaciones +
              ordenesSalidaModel.entrega +
              ordenesSalidaModel.recibe
            ).toLowerCase();

            return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
          });
        // Sort filtered data
        const sortedData = this.sortData(this.filteredData.slice());
        // Grab the page's slice of the filtered sorted data.
        const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
        this.renderedData = sortedData.splice(
          startIndex,
          this.paginator.pageSize
        );
        return this.renderedData;
      })
    );
  }
  disconnect() {
    //disconnect
  }
  /** Returns a sorted copy of the database data. */
  sortData(data: OrdenesSalidaModel[]): OrdenesSalidaModel[] {
    if (!this._sort.active || this._sort.direction === '') {
      return data;
    }
    return data.sort((a, b) => {
      let propertyA: number | string = '';
      let propertyB: number | string = '';
      switch (this._sort.active) {
        case 'id':
          [propertyA, propertyB] = [a.id, b.id];
          break;
        case 'fecha':
          [propertyA, propertyB] = [a.fecha, b.fecha];
          break;
        case 'cantidad_activos':
          [propertyA, propertyB] = [a.cantidad_activos, b.cantidad_activos];
          break;
        case 'placa_vehiculo':
          [propertyA, propertyB] = [a.placa_vehiculo, b.placa_vehiculo];
          break;
        case 'observaciones':
          [propertyA, propertyB] = [a.observaciones, b.observaciones];
          break;
        case 'entrega':
          [propertyA, propertyB] = [a.entrega, b.entrega];
          break;
        case 'recibe':
          [propertyA, propertyB] = [a.recibe, b.recibe];
          break;
      }

      const valueA = isNaN(+propertyA) ? propertyA : +propertyA;
      const valueB = isNaN(+propertyB) ? propertyB : +propertyB;
      return (
        (valueA < valueB ? -1 : 1) * (this._sort.direction === 'asc' ? 1 : -1)
      );
    });
  }
}
