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
  limite_inferior_celsius: number | null;
  limite_superior_celsius: number | null;
  alarm_status: 'ok' | 'low_alarm' | 'high_alarm';
  notifications_enabled: boolean;
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

export interface ActivoInfo {
  id: string;
  descripcion: string | null;
  fabricante: string | null;
  capacidad: number | null;
  nombre_cliente: string | null;
  establecimiento_comercial: string | null;
}

export interface MeasurementSessionDetail {
  session_id: number;
  device_id: string;
  activo_id: string | null;
  activo: ActivoInfo | null;
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
    email: string | null;
    phone: string | null;
  } | null;
  installation: {
    client_id: number;
    equipo_placa: string | null;
    equipo_modelo: string | null;
    limite_inferior_celsius: number | null;
    limite_superior_celsius: number | null;
    observaciones: string | null;
    ubicacion: string | null;
    fecha_instalacion: string | null;
    notifications_enabled?: boolean;
  } | null;
  technician: {
    id: number | null;
    name: string | null;
    addres: string | null;
    position: string | null;
    phone: string | null;
    email: string | null;
    fecha_instalacion: string | null;
  } | null;
  device: {
    device_id: string;
    modelo: string | null;
    sistema: string;
  } | null;
  readings: MonitoringReading[];
}

export interface MeasurementHistoryItem {
  session_id: number;
  device_id: string;
  activo_id: string | null;
  placa: string | null;
  started_at: string;
  fecha_servidor: string;
  readings_count: number;
}

export interface MeasurementHistoryPage {
  page: number;
  page_size: number;
  total: number;
  items: MeasurementHistoryItem[];
}
