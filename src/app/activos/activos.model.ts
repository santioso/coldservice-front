import { formatDate } from '@angular/common';
export class ActivosModel {
  id: string;
  descripcion: string;
  fabricante: string;
  capacidad: number;
  estado: string;
  constructor(activosModel: ActivosModel) {
      this.id = activosModel.id || '';
      this.descripcion = activosModel.descripcion || '';
      this.fabricante = activosModel.fabricante || '';
      this.capacidad = activosModel.capacidad || 0;
      this.estado = activosModel.estado || '';
  }
}
 

