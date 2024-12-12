import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';

export interface DialogData {
  id: number;
  fecha: string;
  placa_vehiculo: string;
  placa_id: string;
  observaciones: string;
  entrega: string;
  recibe: string;
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
    public ordenesServicioService: OrdenesServicioService
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.ordenesServicioService.deleteOrden(this.data.id);
  }
}
