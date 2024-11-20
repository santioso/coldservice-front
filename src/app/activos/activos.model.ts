import { formatDate } from '@angular/common';
export class ActivosModel {
  id: string;
  descripcion: string;
  fabricante: string;
  capacidad: number;
  cliente_id: string;
  nombre_cliente: string;
  establecimiento_comercial: string;
  constructor(activosModel: ActivosModel) {
      this.id = activosModel.id || '';
      this.descripcion = activosModel.descripcion || '';
      this.fabricante = activosModel.fabricante || '';
      this.capacidad = activosModel.capacidad || 0;
      this.cliente_id = activosModel.cliente_id || '';
      this.nombre_cliente = activosModel.nombre_cliente || '';
      this.establecimiento_comercial = activosModel.establecimiento_comercial || '';
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}

