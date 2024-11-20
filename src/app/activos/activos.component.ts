import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivosService } from './activos.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ActivosModel } from './activos.model';
import { DataSource } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { UnsubscribeOnDestroyAdapter } from '../shared/UnsubscribeOnDestroyAdapter';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement } from '@shared';
import { UtilPopupService } from '@shared/services/util-popup.service';

@Component({
  selector: 'app-activos',
  templateUrl: './activos.component.html',
  styleUrls: ['./activos.component.scss'],
  providers: [{
    provide: MAT_DATE_LOCALE,
    useValue: 'es-CO' }],
})
export class ActivosComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  displayedColumns = [
    'select',
    'id',
    'descripcion',
    'fabricante',
    'capacidad',
    'nombre_cliente',
    'establecimiento_comercial',
    'actions',
  ];
  exampleDatabase?: ActivosService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<ActivosModel>(true, []);
  id?: string;
  advanceTable?: ActivosModel;
  activos: ActivosModel[] = [];

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public activosService: ActivosService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private utilPopupService: UtilPopupService,
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
    this.loadActivos();
  }

  refresh() {
    this.loadData();
  }

  loadActivos(): void {
    // this.activosService.getAllActivos().subscribe((data: ActivosModel[]) => {
    //   this.activos = data;
    //   this.cdr.detectChanges(); // Fuerza una nueva verificación de cambios
    // });

    this.activosService.fetchData();
    this.activosService.dataChange.subscribe((data: ActivosModel[]) => {
      this.activos = data;
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
        advanceTable: this.advanceTable,
        action: 'add',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // After dialog is closed we're doing frontend updates
        // For add we're just pushing a new row inside DataService
        this.activosService.addActivos(this.activosService.getDialogData()).subscribe(() => {
          this.loadData();
          this.utilPopupService.mostrarMensaje(`El registro se adicionó correctamente`, 'success', 'Registro adicionado', false);
        });
      }
    });
  }

  editCall(row: ActivosModel) {
    this.id = row.id;
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        activosModel: row,
        action: 'edit',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // When using an edit things are little different, firstly we find record inside DataService by id
        this.activosService.updateActivos(this.activosService.getDialogData()).subscribe(() => {
          this.loadData();
          this.utilPopupService.mostrarMensaje(`El registro se editó correctamente`, 'success', 'Registro editado', false);
        });
      }
    });
  }


  deleteItem(row: ActivosModel) {
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
        this.activosService.deleteActivos(this.id!).subscribe(() => {
          this.loadData();
          this.utilPopupService.mostrarMensaje(`El registro se eliminó correctamente`, 'success', 'Registro eliminado', false);
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
      this.activosService.deleteActivos(item.id).subscribe(() => {
        this.loadData();
        this.selection = new SelectionModel<ActivosModel>(true, []);
      });
    });
    this.utilPopupService.mostrarMensaje(`Los registros se eliminaron correctamente`, 'success', 'Registros eliminados', false);
  }
  public loadData() {
    this.exampleDatabase = this.activosService;
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
    this.loadActivos();
  }

  // export table data in excel file
  exportExcel() {
    // key name with space add in brackets
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        'Placa': x.id,
        'Descripción': x.descripcion,
        'Fabricante': x.fabricante,
        'Capacidad': x.capacidad,
        'Id cliente': x.cliente_id,
        'Cliente': x.nombre_cliente,
        'Establecimiento_comercial': x.establecimiento_comercial,
      }));

    TableExportUtil.exportToExcel(exportData, 'excel');
  }

  // context menu
  onContextMenu(event: MouseEvent, item: ActivosModel) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    if (this.contextMenu !== undefined && this.contextMenu.menu !== null) {
      this.contextMenu.menuData = { item: item };
      this.contextMenu.menu.focusFirstItem('mouse');
      this.contextMenu.openMenu();
    }
  }
}
export class ExampleDataSource extends DataSource<ActivosModel> {
  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }
  filteredData: ActivosModel[] = [];
  renderedData: ActivosModel[] = [];
  constructor(
    public exampleDatabase: ActivosService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }
  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<ActivosModel[]> {
    // Listen for any changes in the base data, sorting, filtering, or pagination
    const displayDataChanges = [
      this.exampleDatabase.dataChange,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];
    this.exampleDatabase.getAllActivos();
    return merge(...displayDataChanges).pipe(
      map(() => {
        // Filter data
        this.filteredData = this.exampleDatabase.data
          .slice()
          .filter((activosModel: ActivosModel) => {
            const searchStr = (
              activosModel.id +
              activosModel.descripcion +
              activosModel.fabricante +
              activosModel.capacidad +
              activosModel.cliente_id +
              activosModel.nombre_cliente +
              activosModel.establecimiento_comercial
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
  sortData(data: ActivosModel[]): ActivosModel[] {
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
        case 'descripcion':
          [propertyA, propertyB] = [a.descripcion, b.descripcion];
          break;
        case 'fabricante':
          [propertyA, propertyB] = [a.fabricante, b.fabricante];
          break;
        case 'capacidad':
          [propertyA, propertyB] = [a.capacidad, b.capacidad];
          break;
        case 'nombre_cliente':
          [propertyA, propertyB] = [a.nombre_cliente, b.nombre_cliente];
          break;
        case 'establecimiento_comercial':
          [propertyA, propertyB] = [a.establecimiento_comercial, b.establecimiento_comercial];
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
