import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
  DeviceOverviewPage,
  DeviceSortMode,
  MeasurementSessionDetail,
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
}
