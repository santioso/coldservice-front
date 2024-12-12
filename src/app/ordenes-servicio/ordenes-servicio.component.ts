import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { OrdenesServicioService } from './ordenes-servicio.service';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { UtilPopupService } from '@shared/services/util-popup.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatMenuTrigger } from '@angular/material/menu';
import { BehaviorSubject, firstValueFrom, fromEvent, map, merge, Observable } from 'rxjs';
import { DataSource, SelectionModel } from '@angular/cdk/collections';
import { CreateOrdenesServicioModel, OrdenesServicioDetailsModel, OrdenesServicioModel } from './ordenes-servicio.model';
import { Direction } from '@angular/cdk/bidi';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';

@Component({
  selector: 'app-ordenes-servicio',
  templateUrl: './ordenes-servicio.component.html',
  styleUrls: ['./ordenes-servicio.component.scss'],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-CO',
    },
  ],
})
export class OrdenesServicioComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  displayedColumns = [
    'id',
    'dateStart',
    'activoEntradaId',
    'descripcion',
    'capacidad',
    'status',
    'diagnosis',
    'ordenEntradaId',
    'observaciones',
    'actions',
  ];
  exampleDatabase?: OrdenesServicioService;
  dataSource!: DatabaseSource;
  selection = new SelectionModel<OrdenesServicioModel>(true, []);
  id?: number;
  ordenesServicioModel?: OrdenesServicioModel;
  ordenesServicio: OrdenesServicioModel[] = [];

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public ordenesServicioService: OrdenesServicioService,
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

  ngOnInit() {
    this.loadData();
    this.loadOrdenesServicio();
  }

  refresh() {
    this.loadData();
  }

  loadOrdenesServicio(): void {
    this.ordenesServicioService.fetchData();
    this.ordenesServicioService.dataChange.subscribe(
      (data: OrdenesServicioModel[]) => {
        this.ordenesServicio = data;
        this.cdr.detectChanges();
      }
    );
  }

  public loadData() {
    this.exampleDatabase = this.ordenesServicioService;
    this.dataSource = new DatabaseSource(
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
    this.loadOrdenesServicio();
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

  addNew() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        ordenesServiciosModel: this.ordenesServicioModel as OrdenesServicioModel,
        action: 'add',
      },
      direction: tempDirection,
      width: '80%',
      height: '75%',
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      this.loadData();
    });
  }

  editService(row: OrdenesServicioDetailsModel) {
    this.id = row.id;
    console.log('row... ', row)

    firstValueFrom(this.ordenesServicioService.getOrderServicedetails(this.id))
    .then((ordenServicio) => {
      let tempDirection: Direction;
      if (localStorage.getItem('isRtl') === 'true') {
        tempDirection = 'rtl';
      } else {
        tempDirection = 'ltr';
      }
      console.log('ordenesServicio', ordenServicio)
      const dialogRef = this.dialog.open(FormDialogComponent, {
        data: {
          ordenesServicioModel: ordenServicio,
          action: 'edit',
        },
        direction: tempDirection,
        width: '80%',
        height: '75%',
      });

      this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
        this.loadData();
      });
    })
  }

  deleteItem(row: OrdenesServicioModel) {
    console.log('Eliminar orden de servicio', row);
  }

  removeSelectedRows() {
    console.log('Eliminar orden de servicio');
  }

  printOrder(row: OrdenesServicioModel) {
    console.log(row);
    //    reporte-orden/orden-entrada
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.renderedData.forEach((row) =>
          this.selection.select(row)
        );
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

  exportExcel() {
    console.log('Exportar orden de servicio');
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

export class DatabaseSource extends DataSource<OrdenesServicioModel> {
  filterChange = new BehaviorSubject('');

  get filter(): string {
    return this.filterChange.value;
  }

  set filter(filter: string) {
    this.filterChange.next(filter);
  }

  filterData: OrdenesServicioModel[] = [];
  renderedData: OrdenesServicioModel[] = [];

  constructor(
    public ordenesServicioService: OrdenesServicioService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<OrdenesServicioModel[]> {
    const displayDataChanges = [
      this.ordenesServicioService.dataChange,
      this.paginator.page,
      this.filterChange,
      this._sort.sortChange,
    ];
    this.ordenesServicioService.getAllOrdenes();
    return merge(...displayDataChanges).pipe(
      map(() => {
        // Filter data
        this.filterData = this.ordenesServicioService.data
          .slice()
          .filter((ordenesServicesModel: OrdenesServicioModel) => {
            const searchStr = (
              ordenesServicesModel.id +
              ordenesServicesModel.diagnosis +
              ordenesServicesModel.status
            ).toLowerCase();

            return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
          });
        // Sort filtered data
        const sortedData = this.sortData(this.filterData.slice());
        // Grab the page's slice of the data.
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
    // disconnect
  }

  sortData(data: OrdenesServicioModel[]): OrdenesServicioModel[] {
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
        case 'dateStart':
          [propertyA, propertyB] = [a.dateStart, b.dateStart];
          break;
        case 'diagnosis':
          [propertyA, propertyB] = [a.diagnosis, b.diagnosis];
          break;
        case 'status':
          [propertyA, propertyB] = [a.status, b.status];
          break;
        case 'capacidad':
          [propertyA, propertyB] = [a.capacidad, b.capacidad];
          break;
        case 'ordenEntradaId':
          [propertyA, propertyB] = [a.ordenEntradaId, b.ordenEntradaId];
          break;
        case 'observaciones':
          [propertyA, propertyB] = [a.observaciones, b.observaciones];
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
