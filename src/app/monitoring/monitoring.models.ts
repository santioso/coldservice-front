export interface MonitoringUser {
  id: number;
  email: string;
  nombre: string | null;
  client_id: number;
}

export interface MonitoringClient {
  id: number;
  name: string;
  nit: string | null;
  logo_url?: string | null;
}

export interface MonitoringSession {
  token: string;
  user: MonitoringUser;
  client: MonitoringClient | null;
}

export interface MonitoringDevice {
  id: number;
  device_id: string;
  modelo: string | null;
  sistema: string;
  activo: boolean;
  ultimo_acceso: string | null;
  fecha_registro: string;
}

export interface MonitoringReading {
  timestamp: string;
  V?: number;
  A?: number;
  W?: number;
  kWh?: number;
  FP?: number;
  T1?: number;
  T2?: number;
  T3?: number;
  T4?: number;
}

export type DeviceSortMode =
  | 'latest'
  | 'serial_asc'
  | 'serial_desc'
  | 'model_asc'
  | 'custom';

export interface DeviceOverviewItem {
  id: number;
  device_id: string;
  modelo: string | null;
  activo: boolean;
  is_live: boolean;
  last_reading_at: string | null;
  readings: MonitoringReading[];
}

export interface DeviceOverviewPage {
  page: number;
  page_size: number;
  total: number;
  items: DeviceOverviewItem[];
}

export interface MeasurementSessionSummary {
  session_id: number;
  started_at: string;
  ended_at: string;
  readings_count: number;
  photos_count: number;
  is_live: boolean;
}

export interface MeasurementSessionDetail {
  session_id: number;
  device_id: string;
  started_at: string;
  readings_count: number;
  photos_count: number;
  is_live: boolean;
  client: {
    id: number;
    name: string;
    nit: string | null;
    ubicacion: string | null;
    logo_url: string | null;
  } | null;
  installation: {
    equipo_placa: string | null;
    equipo_modelo: string | null;
    limite_inferior_celsius: number | null;
    observaciones: string | null;
    ubicacion: string | null;
    tecnico_nombre: string | null;
    tecnico_id: string | null;
    fecha_instalacion: string | null;
  } | null;
  device: {
    device_id: string;
    modelo: string | null;
    sistema: string;
  } | null;
  readings: MonitoringReading[];
}
