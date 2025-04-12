import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivosService } from './activos.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ActivosModel } from './activos.model';
import { DataSource, SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { UnsubscribeOnDestroyAdapter } from '../shared/UnsubscribeOnDestroyAdapter';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement } from '@shared';
import { UtilPopupService } from '@shared/services/util-popup.service';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';

@Component({
  selector: 'app-activos',
  templateUrl: './activos.component.html',
  styleUrls: ['./activos.component.scss'],
  providers: [{
    provide: MAT_DATE_LOCALE,
    useValue: 'es-CO'
  }],
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
    'estado',
    'actions',
  ];
  exampleDatabase: ActivosService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<ActivosModel>(true, []);
  id?: string;
  advanceTable?: ActivosModel;
  activos: ActivosModel[] = [];

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public activosService: ActivosService,
    public ordenesServicioService: OrdenesServicioService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly utilPopupService: UtilPopupService,
  ) {
    super();
    this.exampleDatabase = this.activosService;
  }
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;
  @ViewChild(MatMenuTrigger)
  contextMenu?: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  ngOnInit() {
    this.loadData();
  }

  refresh() {
    this.loadActivos();
  }

  ngAfterViewInit() {
    this.loadData();
  }

  loadActivos(): void {
    this.ordenesServicioService.getActivesEntry().subscribe({
      next: (data: any[]) => {
        this.activos = data.map(item => ({
          id: item.id,
          descripcion: item.descripcion,
          fabricante: item.fabricante,
          capacidad: item.capacidad,
          estado: item.estado,
        }));

        this.exampleDatabase.dataChange.next(this.activos);
        this.exampleDatabase.isTblLoading = false;
        
        // Inicializar dataSource solo si no existe
        if (!this.dataSource) {
          this.initializeDataSource();
        } else {
          // Si ya existe dataSource, solo actualizamos los datos
          this.dataSource.filteredData = [...this.activos];
          this.dataSource.renderedData = [...this.activos];
        }
      },
      error: (error) => {
        console.error('Error al cargar activos:', error);
      }
    });
  }

  private initializeDataSource(): void {
    this.dataSource = new ExampleDataSource(
      this.exampleDatabase,
      this.paginator,
      this.sort
    );
    
    this.dataSource.loadActivos();
    
    this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(
      () => {
        if (!this.dataSource) {
          return;
        }
        this.dataSource.loadActivos(this.filter.nativeElement.value.trim().toLowerCase());
      }
    );
    
    setTimeout(() => {
      this.cdr.detectChanges();
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

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.renderedData.length;
    return numSelected === numRows;
  }

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
    setTimeout(() => {
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
    });
  }

  exportExcel() {
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        'Placa': x.id,
        'Descripción': x.descripcion,
        'Fabricante': x.fabricante,
        'Capacidad': x.capacidad,
        'Estado': x.estado
      }));

    TableExportUtil.exportToExcel(exportData, 'excel');
  }

  onContextMenu(event: MouseEvent, item: ActivosModel) {
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
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }

  loadActivos(filter = ''): void {
    this.filter = filter;
    this.exampleDatabase.getAllActivos();
  }

  connect(): Observable<ActivosModel[]> {
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
              activosModel.estado
            ).toLowerCase();

            return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
          });
        const sortedData = this.sortData(this.filteredData.slice());
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
      }

      const valueA = isNaN(+propertyA) ? propertyA : +propertyA;
      const valueB = isNaN(+propertyB) ? propertyB : +propertyB;
      return (
        (valueA < valueB ? -1 : 1) * (this._sort.direction === 'asc' ? 1 : -1)
      );
    });
  }
}
