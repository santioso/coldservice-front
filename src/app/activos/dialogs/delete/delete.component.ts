import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { ActivosService } from '../../activos.service';

export interface DialogData {
  id: string;
  descripcion: string;
  fabricante: string;
  capacidad: number;
  cliente_id: string;
  nombre_cliente: string;
  establecimiento_comercial: string;
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
    public activosService: ActivosService
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.activosService.deleteActivos(this.data.id);
  }
}
