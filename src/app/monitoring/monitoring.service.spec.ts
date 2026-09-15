import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { MonitoringService } from './monitoring.service';

describe('MonitoringService notification recipients', () => {
  let service: MonitoringService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/api/v1/monitoring/devices/device-1/alarm-configuration/recipients`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MonitoringService],
    });
    service = TestBed.inject(MonitoringService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads recipients for the selected device', () => {
    let response: unknown;
    service.getNotificationRecipients('device-1').subscribe((value) => (response = value));

    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush({ device_id: 'device-1', levels: {} });

    expect(response).toEqual({ device_id: 'device-1', levels: {} });
  });

  it('replaces the complete recipient collection using the backend envelope', () => {
    const recipients = [
      { level: 'level_1' as const, channel: 'email' as const, address: 'email@example.com', enabled: true },
      { level: 'level_1' as const, channel: 'whatsapp' as const, address: '+573001234567', enabled: false },
    ];
    let response: unknown;
    service.replaceNotificationRecipients('device-1', recipients).subscribe((value) => (response = value));

    const request = http.expectOne(url);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ recipients });
    request.flush({ device_id: 'device-1', levels: {} });

    expect(response).toEqual({ device_id: 'device-1', levels: {} });
  });
});
