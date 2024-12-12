export class OrdenesServicioModel {
  id: number;
  dateStart: string;
  descripcion: string;
  activoId: string;
  capacidad: number;
  status: string;
  diagnosis: string;
  ordenEntradaId: number;
  observaciones: string;

  constructor(ordenesServicioModel: OrdenesServicioModel) {
      this.id = ordenesServicioModel.id || 0;
      this.dateStart = ordenesServicioModel.dateStart || '';
      this.descripcion = ordenesServicioModel.descripcion || '';
      this.activoId = ordenesServicioModel.activoId || '';
      this.capacidad = ordenesServicioModel.capacidad || 0;
      this.status = ordenesServicioModel.status || '';
      this.diagnosis = ordenesServicioModel.diagnosis || '';
      this.ordenEntradaId = ordenesServicioModel.ordenEntradaId || 0;
      this.observaciones = ordenesServicioModel.observaciones || '';
    }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}

export interface Technical {
  name: string;
  position: string;
}

export interface Detail {
  id: number;
  description: string;
  status: string;
  technicals: Technical[];
}

export interface OrdenesServicioDetailsModel {
  id: number;
  dateStart: string;
  diagnosis: string;
  details: Detail[];
}

export interface CreateOrdenesServicioModel {
    id: number,
    date_start: Date,
    date_finish: Date | null,
    diagnosis: string,
    activo_entrada_id: number | null,
}

