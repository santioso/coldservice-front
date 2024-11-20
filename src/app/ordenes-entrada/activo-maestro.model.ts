export class ActivoMaestroModel {
  id: string;
  descripcion: string;
  fabricante: string;
  capacidad: string;
  cliente_id: string;
  cliente: string;
  establecimiento: string;

  constructor(activoMaestroModel: ActivoMaestroModel) {
      this.id = activoMaestroModel.id || '';
      this.descripcion = activoMaestroModel.descripcion || '';
      this.fabricante = activoMaestroModel.fabricante || '';
      this.capacidad = activoMaestroModel.capacidad || '';
      this.cliente_id = activoMaestroModel.cliente_id || '';
      this.cliente = activoMaestroModel.cliente || '';
      this.establecimiento = activoMaestroModel.establecimiento || '';
  }
}
