import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { SelectionModel } from '@angular/cdk/collections';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement, UnsubscribeOnDestroyAdapter } from '@shared';
import { AssetsService } from './assets.service';
import { MatTableDataSource } from '@angular/material/table';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { AssetModel } from 'app/models/assets.model';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';

@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.css'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'en-GB' }],

})
export class AssetsComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  displayedColumns = ['id', 'plaque', 'serie', 'model', 'actions'];
  filter = '';
  dataSource = new MatTableDataSource<AssetModel>();
  selection = new SelectionModel<AssetModel>(true, []);
  isTblLoading = true;
  lastId = 0;
  id?: number;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private assetService: AssetsService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {
    super();
  }

  ngOnInit() {
    this.getAssets();
    this.configureFilterPredicate();
  }

  configureFilterPredicate() {
    this.dataSource.filterPredicate = (data: AssetModel, filter: string) => {
      const searchStr = (data.plaque + data.serie + data.model).toLowerCase();
      return searchStr.indexOf(filter.toLowerCase()) !== -1;
    };
  }

  applyFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      const filterValue = input.value.trim().toLowerCase();
      this.dataSource.filter = filterValue;

      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    }
  }

  getAssets() {
    this.assetService.getAll().subscribe(res => console.log(res))
    this.isTblLoading = true;
    this.assetService.getAll().subscribe({
      next: (res: AssetModel[]) => {
        this.dataSource.data = res;
        this.dataSource.paginator = this.paginator;
        this.isTblLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error fetching assets', error);
        this.isTblLoading = false;
      },
      complete: () => { console.log('Fetch complete') }
    });
  }

  //   refresh() {
  //     this.loadData();
  //   }


  refresh() {
    this.getAssets();
  }

  async addNew() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    await this.getLastId();
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        assetData: this.dataSource,
        action: 'add',
        lastId: this.lastId,
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // Agrega el nuevo registro al principio de la tabla
        const newData = this.assetService.getDialogData();
        const updatedData = [newData, ...this.dataSource.data];
        this.dataSource.data = updatedData; // Actualizar la tabla con los nuevos datos
        //    this.refreshTable();
        this.showNotification(
          'snackbar-success',
          'El registro se adiconó con éxito...!!!',
          'bottom',
          'center'
        );
      }
    });

  }

  editCall(row: AssetModel) {
    this.id = row.id;

    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        assetModel: row,
        action: 'edit',
      },
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // When using an edit things are little different, firstly we find record inside DataService by id
        const updatedAsset = this.assetService.getDialogData();

        // Find the index of the item to update
        const foundIndex = this.dataSource.data.findIndex(
          (x) => x.id === this.id
        );

        // Then you update that record using data from dialogData (values you enetered)
        if (foundIndex > -1) {
          this.dataSource.data[foundIndex] = updatedAsset

          // Refresh the table (update view)
          this.dataSource.data = [...this.dataSource.data]; // Trigger Angular change detection

          // And lastly refresh table

          this.showNotification(
            'black',
            'El registro se editó con éxito...!!!',
            'bottom',
            'center'
          );

          //     this.refreshTable();
        }
      }
    });
  }

  deleteItem(row: AssetModel) {
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
        const foundIndex = this.dataSource?.data.findIndex(
          (x) => x.id === this.id
        );
        // for delete we use splice in order to remove single object from DataService
        if (foundIndex > -1) {
          this.dataSource.data.splice(foundIndex, 1);
          this.dataSource.data = [...this.dataSource.data];
          this.showNotification(
            'snackbar-danger',
            'El registro fue borrado con éxtio...!!!',
            'bottom',
            'center'
          );
        }
      }
    });
  }

  getLastId() {
    this.dataSource.data.sort((a, b) => b.id - a.id);
    this.lastId = this.dataSource.data[0].id;
  }

  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }

  //   /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  //   /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) =>
        this.selection.select(row)
      );
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

  //   // export table data in excel file
  exportExcel() {
    // key name with space add in brackets
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        'ID': x.id,
        'Placa': x.plaque,
        'Serie': x.serie,
        'Modelo': x.model,
        'Tipo de activo': x.assetsType
      }));

    TableExportUtil.exportToExcel(exportData, 'excel');
  }

  removeSelectedRows() {
    console.log('delete')
  }

}
