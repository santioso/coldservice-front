import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { DataSource, SelectionModel } from '@angular/cdk/collections';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { BehaviorSubject, firstValueFrom, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { UnsubscribeOnDestroyAdapter } from '../shared/UnsubscribeOnDestroyAdapter';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement } from '@shared';
import { OrdenesEntradaService } from './ordenes-entrada.service';
import { OrdenesEntradaModel } from './ordenes-entrada.model';
import { UtilPopupService } from '@shared/services/util-popup.service';

@Component({
  selector: 'app-ordenes-entrada',
  templateUrl: './ordenes-entrada.component.html',
  styleUrls: ['./ordenes-entrada.component.scss'],
  providers: [{
    provide: MAT_DATE_LOCALE,
    useValue: 'es-CO'
  }],
})
export class OrdenesEntradaComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
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
  exampleDatabase?: OrdenesEntradaService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<OrdenesEntradaModel>(true, []);
  id?: number;
  ordenesEntradaModel?: OrdenesEntradaModel;
  ordenesEntrada: OrdenesEntradaModel[] = [];

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public ordenesEntradaService: OrdenesEntradaService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly utilPopupService: UtilPopupService,
  ) {
    super();
  }
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;
  @ViewChild(MatMenuTrigger)
  contextMenu?: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  ngOnInit() {
    this.loadData();
    this.loadOrdenesEntrada();
  }

  refresh() {
    this.loadData();
  }

  loadOrdenesEntrada(): void {
    // this.ordenesEntradaService.getAllOrdenesEntrada().subscribe((data: OrdenesEntradaModel[]) => {
    //   this.ordenesEntrada = data;
    //   this.cdr.detectChanges(); // Fuerza una nueva verificación de cambios
    // });

    this.ordenesEntradaService.fetchData();
    this.ordenesEntradaService.dataChange.subscribe((data: OrdenesEntradaModel[]) => {
      this.ordenesEntrada = data;
      this.cdr.detectChanges(); // Fuerza una nueva verificación de cambios
    });
  }

  addNew() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        ordenesEntradaModel: this.ordenesEntradaModel,
        action: 'add',
      },
      direction: tempDirection,
      width: '80%',
      height: '95%',
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        this.ordenesEntradaService.addOrden(this.ordenesEntradaService.getDialogData()).subscribe(() => {
          this.loadData();
          this.utilPopupService.mostrarMensaje(`La orden de entrada se guardó correctamente`, 'success', 'Orden de entrada guardada', false);
          this.showNotification(
            'snackbar-success',
            'Add Record Successfully...!!!',
            'bottom',
            'center'
          );
        });
      }
    });
  }

  editCall(row: OrdenesEntradaModel) {
    let ordenesEntrada = null;
    this.id = row.id;

    firstValueFrom(this.ordenesEntradaService.getOrdenById(this.id))
    .then((ordenesEntrada) => {
      let tempDirection: Direction;
      if (localStorage.getItem('isRtl') === 'true') {
        tempDirection = 'rtl';
      } else {
        tempDirection = 'ltr';
      }

      console.log('ordenesEntrada', ordenesEntrada)
      const dialogRef = this.dialog.open(FormDialogComponent, {
        data: {
          ordenesEntradaModel: ordenesEntrada,
          action: 'edit',
        },
        direction: tempDirection,
        width: '80%',
        height: '95%',
      });

      this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
        if (result === 1) {
          // When using an edit things are little different, firstly we find record inside DataService by id
          this.ordenesEntradaService.updateOrden(this.ordenesEntradaService.getDialogData()).subscribe(() => {
            this.loadData();
            this.utilPopupService.mostrarMensaje(`La orden de entrada número ${this.id} se editó correctamente`, 'success', 'Orden de entrada modificada', false);
          });
        }
      });
    });
  }

  printOrder( row: OrdenesEntradaModel){


//    reporte-orden/orden-entrada

  }


  deleteItem(row: OrdenesEntradaModel) {
    this.id = row.id;
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      data: row,
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        this.ordenesEntradaService.deleteOrden(this.id!).subscribe(() => {
          this.loadData();
          this.utilPopupService.mostrarMensaje(`La orden de entrada se eliminó correctamente`, 'success', 'Orden de entrada eliminada', false);
          this.showNotification(
            'snackbar-danger',
            'Delete Record Successfully...!!!',
            'bottom',
            'center'
          );
        });
      }
    });
  }
  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
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
  removeSelectedRows() {
    const totalSelect = this.selection.selected.length;
    this.selection.selected.forEach((item) => {
      this.ordenesEntradaService.deleteOrden(item.id).subscribe(() => {
        this.loadData();
        this.selection = new SelectionModel<OrdenesEntradaModel>(true, []);
      });
    });
    this.utilPopupService.mostrarMensaje(`Se eliminaron las ${totalSelect} órdenes selccionadas`, 'success', 'Órdenes de entrada eliminadas', false);
    this.showNotification(
      'snackbar-danger',
      totalSelect + ' Record Delete Successfully...!!!',
      'bottom',
      'center'
    );
  }
  public loadData() {
    this.exampleDatabase = this.ordenesEntradaService;
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
    this.loadOrdenesEntrada();
  }
  showNotification(
    colorName: string,
    text: string,
    placementFrom: MatSnackBarVerticalPosition,
    placementAlign: MatSnackBarHorizontalPosition
  ) {
    this.snackBar.open(text, '', {
      duration: 2000,
      verticalPosition: placementFrom,
      horizontalPosition: placementAlign,
      panelClass: colorName,
    });
  }

  // export table data in excel file
  exportExcel() {
    // key name with space add in brackets
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        'Id': x.id,
        'Fecha': x.fecha,
        'Cantidad de activos': x.cantidad_activos,
        'Placa vehiculo': x.placa_vehiculo,
        'Observaciones': x.observaciones,
        'Entrega': x.entrega,
        'Recibe': x.recibe,
      }));

    TableExportUtil.exportToExcel(exportData, 'excel');
  }

  // context menu
  onContextMenu(event: MouseEvent, item: OrdenesEntradaModel) {
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
export class ExampleDataSource extends DataSource<OrdenesEntradaModel> {
  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }
  filteredData: OrdenesEntradaModel[] = [];
  renderedData: OrdenesEntradaModel[] = [];
  constructor(
    public exampleDatabase: OrdenesEntradaService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }
  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<OrdenesEntradaModel[]> {
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
          .filter((ordenesEntradaModel: OrdenesEntradaModel) => {
            const searchStr = (
              ordenesEntradaModel.id +
              ordenesEntradaModel.fecha +
              ordenesEntradaModel.placa_vehiculo +
              ordenesEntradaModel.observaciones +
              ordenesEntradaModel.entrega +
              ordenesEntradaModel.recibe
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
  sortData(data: OrdenesEntradaModel[]): OrdenesEntradaModel[] {
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