export class OrdenesSalidaModel {
  id: number;
  fecha: string;
  cantidad_activos: number;
  placa_vehiculo: string;
  observaciones: string;
  entrega: string;
  recibe: string;
  idEntrada: string;
  activosSalida?:[
    {
      id: string;
      descripcion: string;
      fabricante: string;
      capacidad: number;
      observaciones: string;
  }]

  constructor(ordenesSalidaModel: OrdenesSalidaModel) {
      this.id = ordenesSalidaModel.id || 0;
      this.fecha = ordenesSalidaModel.fecha || '';
      this.cantidad_activos = ordenesSalidaModel.cantidad_activos || 0;
      this.placa_vehiculo = ordenesSalidaModel.placa_vehiculo || '';
      this.observaciones = ordenesSalidaModel.observaciones || '';
      this.entrega = ordenesSalidaModel.entrega || '';
      this.recibe = ordenesSalidaModel.recibe || '';
      this.idEntrada = ordenesSalidaModel.idEntrada || '';
      this.activosSalida = ordenesSalidaModel.activosSalida;
  }

}

export interface AddOrdenSalidaInterface {
  fecha: string;
  placa_vehiculo: string;
  observaciones: string;
  entrega: string;
  recibe: string;
  activosSalida:[id: number,]
}

export interface ActivosEnOrdenEntradaInterface {
  idEntrada: number,
  service_order_id: number,
  observaciones: string,
  idActivo: string,
  descripcion: string,
}
