import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { SelectionModel } from '@angular/cdk/collections';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement, UnsubscribeOnDestroyAdapter } from '@shared';
import { MatTableDataSource } from '@angular/material/table';
import { FormDialogClientComponent } from './dialogs/form-dialog/form-dialog-client.component';
import { DeleteDialogClientComponent } from './dialogs/delete/delete-client.component';
import { ClientModel } from 'app/models/client.model';
import { ClientsService } from './clients.service';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'en-GB' }],

})
export class ClientsComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  displayedColumns = ['id', 'nit', 'name', 'actions'];
  filter = '';
  dataSource = new MatTableDataSource<ClientModel>();
  selection = new SelectionModel<ClientModel>(true, []);
  isTblLoading = true;
  lastId = 0;
  id?: number;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;


  constructor(
    private clientService: ClientsService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {
    super();
  }

  ngOnInit() {
    this.getClients();
    this.configureFilterPredicate();
  }


  configureFilterPredicate() {
    this.dataSource.filterPredicate = (data: ClientModel, filter: string) => {
      const searchStr = (data.nit + data.name).toLowerCase();
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

  getClients() {
    this.clientService.getAll().subscribe(res => console.log(res))
    this.isTblLoading = true;
    this.clientService.getAll().subscribe({
      next: (res: ClientModel[]) => {
        this.dataSource.data = res;
        this.dataSource.paginator = this.paginator;
        this.isTblLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error fetching clientes', error);
        this.isTblLoading = false;
      },
      complete: () => { console.log('Fetch complete') }
    });
  }

  //   refresh() {
  //     this.loadData();
  //   }


  refresh() {
    this.getClients();
  }

  async addNew() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    await this.getLastId();
    const dialogRef = this.dialog.open(FormDialogClientComponent, {
      data: {
        clientData: this.dataSource,
        action: 'add',
        lastId: this.lastId,
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // Agrega el nuevo registro al principio de la tabla
        const newData = this.clientService.getDialogData();
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

  editCall(row: ClientModel) {
    this.id = row.id;

    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogClientComponent, {
      data: {
        clientModel: row,
        action: 'edit',
      },
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // When using an edit things are little different, firstly we find record inside DataService by id
        const updatedClient = this.clientService.getDialogData();

        // Find the index of the item to update
        const foundIndex = this.dataSource.data.findIndex(
          (x) => x.id === this.id
        );

        // Then you update that record using data from dialogData (values you enetered)
        if (foundIndex > -1) {
          this.dataSource.data[foundIndex] = updatedClient

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

  deleteItem(row: ClientModel) {
    this.id = row.id;
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteDialogClientComponent, {
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

          // this.showNotification(
          //   'snackbar-danger',
          //   'El registro fue borrado con éxtio...!!!',
          //   'bottom',
          //   'center'
          // );
        }
      }
    });
  }

  getLastId() {
    this.dataSource.data.sort((a, b) => b.id - a.id);
    this.lastId = this.dataSource.data[0].id;
    console.log('this.lastId', this.lastId)
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
        'Nit': x.nit,
        'Nombre': x.name,
      }));

    TableExportUtil.exportToExcel(exportData, 'excel');
  }

  removeSelectedRows() {
  }


}
