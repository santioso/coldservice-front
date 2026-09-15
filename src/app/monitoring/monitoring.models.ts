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
  activo_id: string | null;
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
    valor_kwh: number | null;
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

export type MonitoringNotificationLevel = 'level_1' | 'level_2';
export type MonitoringNotificationChannel = 'email' | 'whatsapp' | 'sms';

export interface MonitoringNotificationRecipient {
  id?: number;
  address: string;
  enabled: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MonitoringNotificationChannels {
  email: MonitoringNotificationRecipient[];
  whatsapp: MonitoringNotificationRecipient[];
  sms: MonitoringNotificationRecipient[];
}

export interface MonitoringNotificationRecipientsResponse {
  device_id: string;
  levels: Record<MonitoringNotificationLevel, MonitoringNotificationChannels>;
}

export interface MonitoringNotificationRecipientInput {
  level: MonitoringNotificationLevel;
  channel: MonitoringNotificationChannel;
  address: string;
  enabled?: boolean;
}

export interface WhatsappNotificationFormValue {
  level: MonitoringNotificationLevel;
  address: string;
  enabled: boolean;
}

export function getWhatsappRecipient(
  configuration: MonitoringNotificationRecipientsResponse,
  level: MonitoringNotificationLevel,
): MonitoringNotificationRecipient | null {
  return configuration.levels[level]?.whatsapp?.[0] ?? null;
}

export function buildNotificationRecipientsPayload(
  configuration: MonitoringNotificationRecipientsResponse,
  whatsappValues: WhatsappNotificationFormValue[],
): MonitoringNotificationRecipientInput[] {
  const payload: MonitoringNotificationRecipientInput[] = [];

  for (const level of ['level_1', 'level_2'] as MonitoringNotificationLevel[]) {
    for (const channel of ['email', 'sms'] as const) {
      for (const recipient of configuration.levels[level]?.[channel] ?? []) {
        payload.push({
          level,
          channel,
          address: recipient.address,
          enabled: recipient.enabled,
        });
      }
    }
  }

  for (const value of whatsappValues) {
    const address = value.address.trim();
    if (!address) {
      continue;
    }
    payload.push({
      level: value.level,
      channel: 'whatsapp',
      address,
      enabled: value.enabled,
    });
  }

  return payload;
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
