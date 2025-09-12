// Tipos y contratos para el módulo de Informes

export interface InformeValorEntity {
  id?: number;
  informe_id?: number;
  gabinete: number | null;
  ambiente: number | null;
  corriente: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface InformeEntity {
  id?: number;
  fecha: string; // YYYY-MM-DD
  hora?: string | null; // HH:mm o null
  planta: string;
  equipo?: string | null;
  tecnico?: string | null;
  cliente?: string | null;
  ubicacion?: string | null;
  temperatura_limite?: number | null;
  checklist?: string | null;
  created_at?: string;
  updated_at?: string;
  valores?: InformeValorEntity[];
}

export interface PlantaFechaRow {
  id: number;
  fecha: string; // YYYY-MM-DD (sin hora)
  planta: string;
  hora: string | null;
  equipo: string | null;
  tecnico: string | null;
  cliente: string | null;
  ubicacion: string | null;
  temperatura_limite: number | null;
  checklist: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiResponseWithCount<T> extends ApiResponse<T> {
  count?: number;
}

export interface ImportResult {
  totalInformes: number;
}
