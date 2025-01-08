import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';
import { UtilPopupService } from '@shared/services/util-popup.service';

export interface DialogData {
  id: number;
  created_at: string;
  observaciones: string;
  status: string;
  technical: string;
}

@Component({
  selector: 'app-delete',
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss'],
})
export class DeleteDialogDetailComponent {
  respuesta: any;

  constructor(
    public dialogRef: MatDialogRef<DeleteDialogDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ordenesServicioService: OrdenesServicioService,
    private utilPopupService: UtilPopupService,
  ) {
   }
  onNoClick(): void {
    this.dialogRef.close(this.respuesta);
  }
  confirmDelete(): void {
      this.ordenesServicioService.deleteServiceOrderDetail(this.data.id).subscribe({
      next: (resp) => {
        this.utilPopupService.mostrarMensaje(
          `el detalle de la orden de servicio No. ${this.data.id}, se eliminó correctamente`,
          'success',
          'Detalle de la orden de servicio eliminada',
          false
        );
        this.respuesta = resp;
      },
      error: (err) => {
        this.utilPopupService.mostrarMensaje(
          `Ocurrió un error al borrar el detalle orden de servicio No. ${this.data.id}`,
          'error',
          'Error al borrar el detalle de la orden de servicio',
          false
        );
      },
      complete: () => {
        this.dialogRef.close(this.respuesta);
      }
    });
  }
}
