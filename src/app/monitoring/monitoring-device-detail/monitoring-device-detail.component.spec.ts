import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, of, Subject } from 'rxjs';
import { MonitoringDeviceDetailComponent } from './monitoring-device-detail.component';
import { MonitoringService } from '../monitoring.service';
import { ActivoDialogResult } from '../monitoring-activo-dialog.component';
import {
  MonitoringAlarmConfiguration,
  MonitoringNotificationRecipientsResponse,
} from '../monitoring.models';
import { MonitoringWhatsappRecipientsDialogResult } from '../monitoring-whatsapp-recipients-dialog.component';

describe('MonitoringDeviceDetailComponent dialog result handling', () => {
  let component: MonitoringDeviceDetailComponent;

  beforeEach(() => {
    component = new MonitoringDeviceDetailComponent(
      {} as ActivatedRoute,
      {} as Router,
      {} as MonitoringService,
      {} as MatDialog,
      {} as MatSnackBar,
    );
  });

  it('updates alarm and recipient state from independent successful saves', () => {
    const alarmConfiguration = {
      device_id: 'device-1',
      temperature_metric: 'T1',
      minimum_celsius: -5,
      maximum_celsius: 8,
      enabled: true,
      out_of_range_duration_minutes: 10,
      in_range_resolution_duration_minutes: 5,
      stale_data_after_minutes: 5,
      repeat_interval_minutes: 30,
      repeat_count: 4,
      post_repeat_interval_minutes: 60,
    } satisfies MonitoringAlarmConfiguration;
    const notificationRecipients = {
      device_id: 'device-1',
      levels: {
        level_1: { email: [], whatsapp: [], sms: [] },
        level_2: { email: [], whatsapp: [], sms: [] },
      },
    } satisfies MonitoringNotificationRecipientsResponse;
    const result: MonitoringWhatsappRecipientsDialogResult = {
      alarmConfiguration,
      notificationRecipients,
    };

    (component as unknown as {
      applyDialogResult: (dialogResult: MonitoringWhatsappRecipientsDialogResult) => void;
    }).applyDialogResult(result);

    expect(component.alarmConfiguration).toBe(alarmConfiguration);
    expect(component.notificationRecipients).toBe(notificationRecipients);
    expect(component.alarmConfigurationError).toBe('');
  });

  it('keeps the new measurement client from the client-snapshot response', () => {
    const updatedDetail = {
      session_id: 7,
      device_id: 'device-1',
      activo_id: null,
      activo: null,
      started_at: new Date().toISOString(),
      readings_count: 1,
      photos_count: 0,
      is_live: true,
      client: { id: 3, name: 'New Client' },
      installation: { client_id: 3, valor_kwh: 1.2 },
      technician: null,
      device: null,
      readings: [],
    } as any;
    const updateSessionCliente = jasmine
      .createSpy('updateSessionCliente')
      .and.returnValue(of(updatedDetail));
    const transferCurrentClient = jasmine.createSpy('transferCurrentClient');
    const loadLiveMeasurement = spyOn(component, 'loadLiveMeasurement').and.stub();
    (component as any).buildCharts = jasmine.createSpy('buildCharts');
    component.deviceId = 'device-1';
    component.detail = {
      ...updatedDetail,
      client: { id: 6, name: 'Old Client' },
      installation: { client_id: 6, valor_kwh: 1.2 },
    };
    (component as any).monitoringService = {
      updateSessionCliente,
      transferCurrentClient,
    };
    (component as any).dialog = {
      open: jasmine
        .createSpy('open')
        .and.returnValue({ afterClosed: () => of({ cliente_id: 3 }) }),
    };
    (component as any).snackBar = { open: jasmine.createSpy('open') };

    component.openClienteDialog();

    expect(updateSessionCliente).toHaveBeenCalledWith('device-1', 7, 3);
    expect(transferCurrentClient).not.toHaveBeenCalled();
    expect(component.detail).toBe(updatedDetail);
    expect(loadLiveMeasurement).not.toHaveBeenCalled();
  });

  it('includes null temperature limits when the activo dialog clears them', () => {
    const updateSessionInstallation = jasmine
      .createSpy('updateSessionInstallation')
      .and.returnValue(of({ success: true }));
    const result: ActivoDialogResult = {
      activo_id: 'activo-1',
      equipo_placa: 'ABC123',
      equipo_modelo: 'Model X',
      limite_inferior_celsius: null,
      limite_superior_celsius: null,
      ubicacion: 'Warehouse',
      observaciones: 'Updated installation',
      kwhPrice: 2.5,
      createdActivo: true,
    };
    component.deviceId = 'device-1';
    component.detail = { session_id: 7 } as any;
    (component as any).monitoringService = { updateSessionInstallation };
    (component as any).dialog = {
      open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(result) }),
    };
    (component as any).snackBar = { open: jasmine.createSpy('open') };
    spyOn(component, 'loadLiveMeasurement').and.stub();

    component.openActivoDialog();

    expect(updateSessionInstallation).toHaveBeenCalledWith('device-1', 7, {
      equipo_placa: 'ABC123',
      equipo_modelo: 'Model X',
      limite_inferior_celsius: null,
      limite_superior_celsius: null,
      valor_kwh: 2.5,
      ubicacion: 'Warehouse',
      observaciones: 'Updated installation',
    });
  });

  it('cancels an active live request and ignores it while updating the measurement client', () => {
    const oldDetail = {
      session_id: 7,
      device_id: 'device-1',
      is_live: true,
      client: { id: 6, name: 'Old Client' },
      installation: { client_id: 6, valor_kwh: 1.2 },
      readings: [],
    } as any;
    const updatedDetail = {
      ...oldDetail,
      client: { id: 3, name: 'New Client' },
      installation: { client_id: 3, valor_kwh: 1.2 },
    } as any;
    const activeLiveResponse = new Subject<any>();
    const resumedLiveResponse = new Subject<any>();
    const snapshotResponse = new Subject<any>();
    let activeRequestFinalized = false;
    const live = jasmine
      .createSpy('live')
      .and.returnValues(
        activeLiveResponse.asObservable().pipe(finalize(() => (activeRequestFinalized = true))),
        resumedLiveResponse.asObservable(),
      );
    const updateSessionCliente = jasmine
      .createSpy('updateSessionCliente')
      .and.returnValue(snapshotResponse.asObservable());
    const transferCurrentClient = jasmine.createSpy('transferCurrentClient');
    (component as any).monitoringService = {
      live,
      updateSessionCliente,
      transferCurrentClient,
    };
    (component as any).buildCharts = jasmine.createSpy('buildCharts');
    (component as any).dialog = {
      open: jasmine
        .createSpy('open')
        .and.returnValue({ afterClosed: () => of({ cliente_id: 3 }) }),
    };
    (component as any).snackBar = { open: jasmine.createSpy('open') };
    component.deviceId = 'device-1';
    component.detail = oldDetail;

    jasmine.clock().install();
    try {
      (component as any).startPolling();
      component.loadLiveMeasurement();

      component.openClienteDialog();

      expect(activeRequestFinalized).toBeTrue();
      jasmine.clock().tick(8000);
      expect(live).toHaveBeenCalledTimes(1);

      snapshotResponse.next(updatedDetail);
      activeLiveResponse.next(oldDetail);
      expect(component.detail).toBe(updatedDetail);
      expect(transferCurrentClient).not.toHaveBeenCalled();

      jasmine.clock().tick(8000);
      expect(live).toHaveBeenCalledTimes(2);
    } finally {
      component.ngOnDestroy();
      jasmine.clock().uninstall();
    }
  });

  it('ignores an older live measurement response after a newer request completes', () => {
    const staleDetail = {
      session_id: 7,
      device_id: 'device-1',
      is_live: true,
      client: { id: 6, name: 'Old Client' },
      installation: { client_id: 6, valor_kwh: 1.2 },
      readings: [],
    } as any;
    const updatedDetail = {
      ...staleDetail,
      client: { id: 3, name: 'New Client' },
      installation: { client_id: 3, valor_kwh: 1.2 },
    } as any;
    const staleResponse = new Subject<any>();
    const latestResponse = new Subject<any>();
    let staleRequestUnsubscribed = false;
    const live = jasmine
      .createSpy('live')
      .and.returnValues(
        staleResponse.asObservable().pipe(finalize(() => (staleRequestUnsubscribed = true))),
        latestResponse.asObservable(),
      );
    (component as any).monitoringService = { live };
    (component as any).buildCharts = jasmine.createSpy('buildCharts');
    component.deviceId = 'device-1';
    component.detail = staleDetail;

    component.loadLiveMeasurement();
    component.loadLiveMeasurement();

    expect(staleRequestUnsubscribed).toBeTrue();
    latestResponse.next(updatedDetail);
    staleResponse.next(staleDetail);
    staleResponse.error(new Error('stale response failed'));

    expect(component.detail).toBe(updatedDetail);
    expect(component.detail?.client?.id).toBe(3);
    expect(component.error).toBe('');
    expect(component.loading).toBeFalse();
  });

  it('does not cancel or restart an active polling request, then starts after it settles', () => {
    const firstResponse = new Subject<any>();
    const secondResponse = new Subject<any>();
    let firstRequestFinalized = false;
    const live = jasmine
      .createSpy('live')
      .and.returnValues(
        firstResponse.asObservable().pipe(finalize(() => (firstRequestFinalized = true))),
        secondResponse.asObservable(),
      );
    (component as any).monitoringService = { live };
    component.deviceId = 'device-1';

    jasmine.clock().install();
    try {
      (component as any).startPolling();

      jasmine.clock().tick(8000);
      expect(live).toHaveBeenCalledTimes(1);

      jasmine.clock().tick(8000);
      expect(live).toHaveBeenCalledTimes(1);
      expect(firstRequestFinalized).toBeFalse();

      firstResponse.complete();
      expect(firstRequestFinalized).toBeTrue();

      jasmine.clock().tick(8000);
      expect(live).toHaveBeenCalledTimes(2);
    } finally {
      component.ngOnDestroy();
      jasmine.clock().uninstall();
    }
  });
});

describe('MonitoringDeviceDetailComponent chart updates', () => {
  let component: MonitoringDeviceDetailComponent;
  let liveResponses: Subject<any>[];
  let monitoringService: jasmine.SpyObj<MonitoringService>;

  const detailWithTimestamp = (timestamp: string, clientId = 3) => ({
    session_id: 7,
    device_id: 'device-1',
    activo_id: null,
    activo: null,
    started_at: '2026-10-03T11:00:00.000Z',
    readings_count: 1,
    photos_count: 0,
    is_live: true,
    client: { id: clientId, name: 'Client' },
    installation: {
      client_id: clientId,
      limite_inferior_celsius: 0,
      limite_superior_celsius: 8,
      valor_kwh: 1.2,
    },
    technician: null,
    device: null,
    readings: [{ timestamp, T1: 4.5, A: 1, V: 120 }],
  });

  beforeEach(() => {
    liveResponses = [];
    monitoringService = jasmine.createSpyObj<MonitoringService>('MonitoringService', ['live']);
    monitoringService.live.and.callFake(() => {
      const response = new Subject<any>();
      liveResponses.push(response);
      return response.asObservable();
    });
    component = new MonitoringDeviceDetailComponent(
      {} as ActivatedRoute,
      {} as Router,
      monitoringService,
      {} as MatDialog,
      {} as MatSnackBar,
    );
    component.deviceId = 'device-1';
  });

  it('animates the first and genuinely new reading, but not metadata-only polling updates', () => {
    component.loadLiveMeasurement();
    liveResponses[0].next(detailWithTimestamp('2026-10-03T12:00:00.000Z'));
    expect((component.mainChart?.options as any).animation).toEqual({
      duration: 400,
      easing: 'easeOutCubic',
    });

    component.loadLiveMeasurement();
    liveResponses[1].next(detailWithTimestamp('2026-10-03T12:00:00.000Z', 4));
    expect((component.mainChart?.options as any).animation).toBeFalse();
    expect((component.tempsChart?.options as any).animation).toBeFalse();

    component.loadLiveMeasurement();
    liveResponses[2].next(detailWithTimestamp('2026-10-03T12:00:08.000Z', 4));
    expect((component.mainChart?.options as any).animation).toEqual({
      duration: 400,
      easing: 'easeOutCubic',
    });

    component.ngOnDestroy();
  });
});
