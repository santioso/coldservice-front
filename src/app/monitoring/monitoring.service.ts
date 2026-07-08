import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
  DeviceOverviewPage,
  DeviceSortMode,
  MeasurementSessionDetail,
  MeasurementHistoryPage,
  MonitoringDevice,
  MonitoringReading,
} from './monitoring.models';

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/monitoring/devices`;

  constructor(private readonly http: HttpClient) {}

  devices(): Observable<MonitoringDevice[]> {
    return this.http.get<MonitoringDevice[]>(this.baseUrl);
  }

  searchActivos(q: string): Observable<MonitoringActivoSearchItem[]> {
    const params = new HttpParams().set('q', q.trim());
    return this.http.get<MonitoringActivoSearchItem[]>(
      `${this.baseUrl}/activos/search`,
      { params },
    );
  }

  overview(
    page: number,
    pageSize: number,
    sort: DeviceSortMode,
    customOrder: string[],
  ): Observable<DeviceOverviewPage> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize))
      .set('sort', sort);
    if (sort === 'custom' && customOrder.length) {
      params = params.set('customOrder', customOrder.join(','));
    }
    return this.http.get<DeviceOverviewPage>(`${this.baseUrl}/overview`, {
      params,
    });
  }

  latest(
    deviceId: string,
  ): Observable<{ device_id: string; reading: MonitoringReading | null }> {
    return this.http.get<{
      device_id: string;
      reading: MonitoringReading | null;
    }>(`${this.baseUrl}/${encodeURIComponent(deviceId)}/latest`);
  }

  live(deviceId: string): Observable<MeasurementSessionDetail | null> {
    return this.http.get<MeasurementSessionDetail | null>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/live`,
    );
  }

  history(filters: {
    placa?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }): Observable<MeasurementHistoryPage> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('pageSize', String(filters.pageSize));
    if (filters.placa && filters.placa.trim().length >= 4) {
      params = params.set('placa', filters.placa.trim());
    }
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<MeasurementHistoryPage>(`${this.baseUrl}/history`, {
      params,
    });
  }

  readings(
    deviceId: string,
    from?: Date,
    to?: Date,
  ): Observable<{ device_id: string; readings: MonitoringReading[] }> {
    let params = new HttpParams();
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());
    return this.http.get<{ device_id: string; readings: MonitoringReading[] }>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/readings`,
      { params },
    );
  }

  sessions(deviceId: string): Observable<{
    device_id: string;
    sessions: Array<{
      session_id: number;
      started_at: string;
      ended_at: string;
      readings_count: number;
      photos_count: number;
      is_live: boolean;
    }>;
  }> {
    return this.http.get<{
      device_id: string;
      sessions: Array<{
        session_id: number;
        started_at: string;
        ended_at: string;
        readings_count: number;
        photos_count: number;
        is_live: boolean;
      }>;
    }>(`${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions`);
  }

  session(
    deviceId: string,
    sessionId: number,
  ): Observable<MeasurementSessionDetail> {
    return this.http.get<MeasurementSessionDetail>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}`,
    );
  }

  downloadSessionPdf(deviceId: string, sessionId: number, chartsPerRow?: number) {
    let params = new HttpParams();
    if (chartsPerRow) {
      params = params.set('chartsPerRow', String(chartsPerRow));
    }
    return this.http.get(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}/pdf`,
      { params, observe: 'response', responseType: 'blob' },
    );
  }

  deleteSession(
    deviceId: string,
    sessionId: number,
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}`,
    );
  }

  assignSessionActivo(
    deviceId: string,
    sessionId: number,
    data: {
      activo_id: string;
      limite_inferior_celsius?: number | null;
      limite_superior_celsius?: number | null;
      ubicacion?: string | null;
      observaciones?: string | null;
    },
  ): Observable<MeasurementSessionDetail> {
    return this.http.patch<MeasurementSessionDetail>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}/assign-activo`,
      data,
    );
  }

  updateSessionActivo(
    deviceId: string,
    sessionId: number,
    activoId: string,
  ): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}/assign-activo`,
      { activo_id: activoId },
    );
  }

  updateSessionCliente(
    deviceId: string,
    sessionId: number,
    clienteId: number,
  ): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}/cliente`,
      { cliente_id: clienteId },
    );
  }

  updateSessionInstallation(
    deviceId: string,
    sessionId: number,
    data: {
      equipo_placa?: string;
      equipo_modelo?: string;
      limite_inferior_celsius?: number;
      limite_superior_celsius?: number;
      observaciones?: string;
      ubicacion?: string;
      fecha_instalacion?: string | null;
      notifications_enabled?: boolean;
    },
  ): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}/installation-snapshot`,
      data,
    );
  }

  updateSessionTechnician(
    deviceId: string,
    sessionId: number,
    data: {
      tecnico_nombre?: string | null;
      technical_id?: number | null;
      position?: string | null;
      phone?: string | null;
      email?: string | null;
      fecha_instalacion?: string | null;
    },
  ): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/sessions/${sessionId}/tecnico`,
      data,
    );
  }

}

export interface MonitoringActivoSearchItem {
  id: string;
  descripcion: string | null;
  fabricante: string | null;
  capacidad: number | null;
  cliente_id: string | null;
  nombre_cliente: string | null;
  establecimiento_comercial: string | null;
}
