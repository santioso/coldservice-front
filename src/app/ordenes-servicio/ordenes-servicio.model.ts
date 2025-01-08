export class OrdenesServicioModel {
  id: number;
  dateStart: string;
  activoId: string;
  descripcion: string;
  diagnosis: string;
  status: string;
  capacidad: number;
  ordenEntradaId: number;
  observaciones: string;
  activoEntradaId: number;
  details: Detail[];

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
      this.activoEntradaId = ordenesServicioModel.activoEntradaId || 0;
      this.details = ordenesServicioModel.details || [];
    }
}

export class ActivesEntryModel {
  ordenEntradaId: number;
  activoId: string;
  serviceOrderId: number;
  ordenSalidaId: number;
  status: string;
  observaciones: string;
  descripcion: string;
  capacidad: number;
  activoEntradaId: number;

  constructor(activesEntryModel: ActivesEntryModel) {
    this.ordenEntradaId = activesEntryModel.ordenEntradaId || 0;
    this.activoId = activesEntryModel.activoId || '';
    this.serviceOrderId = activesEntryModel.serviceOrderId || 0;
    this.ordenSalidaId = activesEntryModel.ordenSalidaId || 0;
    this.status = activesEntryModel.status || '';
    this.observaciones = activesEntryModel.observaciones || '';
    this.descripcion = activesEntryModel.descripcion || '';
    this.capacidad = activesEntryModel.capacidad || 0;
    this.activoEntradaId = activesEntryModel.activoEntradaId || 0;
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

