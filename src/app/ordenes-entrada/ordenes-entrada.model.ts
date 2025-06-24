export class OrdenesEntradaModel {
  id: number;
  fecha: string;
  cantidad_activos: number;
  placa_vehiculo: string;
  observaciones: string;
  entrega: string;
  recibe: string;
  recibeNombre?: string;
  activosEntrada?:[
    {
      id: string;
      descripcion: string;
      fabricante: string;
      capacidad: number;
      observaciones: string;
  }]
  constructor(ordenesEntradaModel: OrdenesEntradaModel) {
      this.id = ordenesEntradaModel.id || 0;
      this.fecha = ordenesEntradaModel.fecha || '';
      this.cantidad_activos = ordenesEntradaModel.cantidad_activos || 0;
      this.placa_vehiculo = ordenesEntradaModel.placa_vehiculo || '';
      this.observaciones = ordenesEntradaModel.observaciones || '';
      this.entrega = ordenesEntradaModel.entrega || '';
      this.recibe = ordenesEntradaModel.recibe || '';
      this.recibeNombre = ordenesEntradaModel.recibeNombre;
      this.activosEntrada = ordenesEntradaModel.activosEntrada;
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
