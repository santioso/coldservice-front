import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';
import { UtilPopupService } from '@shared/services/util-popup.service';

export interface DialogData {
  id: number;
  dateStart: string;
  activoId: string;
  descripcion: string;
  diagnosis: string;
  status: string;
}

@Component({
  selector: 'app-delete',
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss'],
})
export class DeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ordenesServicioService: OrdenesServicioService,
    private utilPopupService: UtilPopupService,
  ) {

    console.log('data', data)
   }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.ordenesServicioService.deleteOrden(this.data.id).subscribe({
      next: (resp) => {
        this.utilPopupService.mostrarMensaje(
          `La orden de servicio No. ${this.data.id}, se eliminó correctamente`,
          'success',
          'Orden de servicio eliminada',
          false
        );
      },
      error: (err) => {
        this.utilPopupService.mostrarMensaje(
          `Ocurrió un error al borrar la orden de servicio No. ${this.data.id}`,
          'error',
          'Error al borrar la orden de servicio',
          false
        );
      },
      complete: () => {
        this.dialogRef.close();
      }
    });
  }
}
