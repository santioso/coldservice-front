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
      jasmine.clock().tick(30000);
      expect(live).toHaveBeenCalledTimes(1);

      snapshotResponse.next(updatedDetail);
      activeLiveResponse.next(oldDetail);
      expect(component.detail).toBe(updatedDetail);
      expect(transferCurrentClient).not.toHaveBeenCalled();

      jasmine.clock().tick(30000);
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

      jasmine.clock().tick(30000);
      expect(live).toHaveBeenCalledTimes(1);

      jasmine.clock().tick(30000);
      expect(live).toHaveBeenCalledTimes(1);
      expect(firstRequestFinalized).toBeFalse();

      firstResponse.complete();
      expect(firstRequestFinalized).toBeTrue();

      jasmine.clock().tick(30000);
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
    monitoringService = jasmine.createSpyObj<MonitoringService>('MonitoringService', ['live', 'readings']);
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
    const buildCharts = spyOn<any>(component as any, 'buildCharts').and.callThrough();

    component.loadLiveMeasurement();
    liveResponses[0].next(detailWithTimestamp('2026-10-03T12:00:00.000Z'));
    expect(buildCharts).toHaveBeenCalledTimes(1);
    expect((component.mainChart?.options as any).animation).toEqual({
      duration: 400,
      easing: 'easeOutCubic',
    });

    component.loadLiveMeasurement();
    liveResponses[1].next(detailWithTimestamp('2026-10-03T12:00:00.000Z', 4));
    expect(buildCharts).toHaveBeenCalledTimes(1);
    expect((component.mainChart?.options as any).animation).toEqual({
      duration: 400,
      easing: 'easeOutCubic',
    });
    expect((component.tempsChart?.options as any).animation).toEqual({
      duration: 400,
      easing: 'easeOutCubic',
    });

    component.loadLiveMeasurement();
    liveResponses[2].next(detailWithTimestamp('2026-10-03T12:00:08.000Z', 4));
    expect(buildCharts).toHaveBeenCalledTimes(2);
    expect((component.mainChart?.options as any).animation).toEqual({
      duration: 400,
      easing: 'easeOutCubic',
    });

    component.ngOnDestroy();
  });

  it('rebuilds charts when chart limits change without a new reading', () => {
    const buildCharts = spyOn<any>(component as any, 'buildCharts').and.callThrough();

    component.loadLiveMeasurement();
    liveResponses[0].next(detailWithTimestamp('2026-10-03T12:00:00.000Z'));
    const initialChart = component.mainChart;

    component.loadLiveMeasurement();
    const updatedDetail = detailWithTimestamp('2026-10-03T12:00:00.000Z');
    updatedDetail.installation.limite_superior_celsius = 9;
    liveResponses[1].next(updatedDetail);

    expect(buildCharts).toHaveBeenCalledTimes(2);
    expect(component.mainChart).not.toBe(initialChart);
  });

  it('uses the backend latest timestamp and falls back to the last visible reading', () => {
    const detail = detailWithTimestamp('2026-10-03T12:00:00.000Z') as any;
    component.detail = {
      ...detail,
      last_reading_at: '2026-10-03T12:01:00.000Z',
      readings_received_count: 10,
    };

    expect(component.latestMeasurementAt).toBe('2026-10-03T12:01:00.000Z');
    expect(component.readingsReceivedCount).toBe(10);

    component.detail = detail;
    expect(component.readingsReceivedCount).toBe(1);
    expect(component.latestMeasurementAt).toBe('2026-10-03T12:00:00.000Z');
  });

  it('uses the backend first timestamp and falls back to the earliest visible reading or session start', () => {
    const detail = detailWithTimestamp('2026-10-03T12:00:00.000Z') as any;
    component.detail = {
      ...detail,
      first_reading_at: '2026-10-03T11:00:00.000Z',
      last_reading_at: '2026-10-03T12:01:00.000Z',
    };

    expect(component.firstMeasurementAt).toBe('2026-10-03T11:00:00.000Z');

    component.detail = {
      ...detail,
      first_reading_at: null,
      readings: [
        { timestamp: '2026-10-03T12:00:00.000Z' },
        { timestamp: '2026-10-03T10:00:00.000Z' },
      ],
    };
    expect(component.firstMeasurementAt).toBe('2026-10-03T10:00:00.000Z');

    component.detail = {
      ...detail,
      first_reading_at: 'not-a-date',
      readings: [],
    };
    expect(component.firstMeasurementAt).toBe(detail.started_at);
  });

  it('prefers full-session equipment metadata and falls back for older responses', () => {
    const detail = detailWithTimestamp('2026-10-03T12:00:00.000Z') as any;
    component.detail = {
      ...detail,
      total_consumption_kwh: 12.5,
      set_point_duration_minutes: 125,
    };

    expect(component.accumulatedConsumptionKwh).toBe(12.5);
    expect(component.accumulatedConsumptionCost).toBe(15);
    expect(component.setPointDuration).toBe('2 h 5 min');

    component.detail = {
      ...detail,
      readings: [
        { timestamp: '2026-10-03T10:00:00.000Z', kWh: 2, T1: 4 },
        { timestamp: '2026-10-03T11:00:00.000Z', kWh: 2.5, T1: 0 },
      ],
    };

    expect(component.accumulatedConsumptionKwh).toBe(0.5);
    expect(component.accumulatedConsumptionCost).toBe(0.6);
    expect(component.setPointDuration).toBe('1 h');
  });

  it('keeps rendered detail and charts visible during a background refresh', () => {
    component.loadLiveMeasurement();
    const renderedDetail = detailWithTimestamp('2026-10-03T12:00:00.000Z') as any;
    liveResponses[0].next(renderedDetail);
    liveResponses[0].complete();
    const renderedChart = component.mainChart;

    jasmine.clock().install();
    try {
      (component as any).startPolling();
      jasmine.clock().tick(30000);

      expect(liveResponses.length).toBe(2);
      expect(component.loading).toBeTrue();
      expect(component.refreshing).toBeTrue();
      expect(component.detail).toBe(renderedDetail);
      expect(component.mainChart).toBe(renderedChart);

      liveResponses[1].next(null);

      expect(component.loading).toBeFalse();
      expect(component.refreshing).toBeFalse();
      expect(component.detail).toBe(renderedDetail);
      expect(component.mainChart).toBe(renderedChart);

      component.loadLiveMeasurement();
      expect(component.refreshing).toBeTrue();
      liveResponses[2].error(new Error('network failure'));

      expect(component.refreshing).toBeFalse();
      expect(component.detail).toBe(renderedDetail);
      expect(component.mainChart).toBe(renderedChart);
    } finally {
      component.ngOnDestroy();
      jasmine.clock().uninstall();
    }
  });

  it('offers the supported chart ranges with eight hours selected by default', () => {
    expect(component.chartRangeOptions).toEqual([2, 6, 8, 12, 24]);
    expect(Number(component.selectedChartRangeHours)).toBe(8);
    expect(component.chartWindowMs).toBe(8 * 60 * 60 * 1000);
  });

  it('disables 12-hour and 24-hour options when only about two hours are available', () => {
    component.detail = {
      ...detailWithTimestamp('2026-10-03T12:00:00.000Z'),
      first_reading_at: '2026-10-03T10:00:00.000Z',
      last_reading_at: '2026-10-03T12:00:00.000Z',
    } as any;

    expect(component.isChartRangeOptionDisabled(2)).toBeFalse();
    expect(component.isChartRangeOptionDisabled(6)).toBeFalse();
    expect(component.isChartRangeOptionDisabled(8)).toBeFalse();
    expect(component.isChartRangeOptionDisabled(12)).toBeTrue();
    expect(component.isChartRangeOptionDisabled(24)).toBeTrue();
  });

  it('enables 12 hours and disables 24 hours when exactly 12 hours are available', () => {
    component.detail = {
      ...detailWithTimestamp('2026-10-03T12:00:00.000Z'),
      first_reading_at: '2026-10-03T00:00:00.000Z',
      last_reading_at: '2026-10-03T12:00:00.000Z',
    } as any;

    expect(component.isChartRangeOptionDisabled(12)).toBeFalse();
    expect(component.isChartRangeOptionDisabled(24)).toBeTrue();
  });

  it('ignores a programmatic selection of a disabled range', () => {
    component.detail = {
      ...detailWithTimestamp('2026-10-03T12:00:00.000Z'),
      first_reading_at: '2026-10-03T10:00:00.000Z',
      last_reading_at: '2026-10-03T12:00:00.000Z',
    } as any;
    component.selectedChartRangeHours = 8;

    component.onChartRangeChange(12);

    expect(Number(component.selectedChartRangeHours)).toBe(8);
    expect(monitoringService.readings).not.toHaveBeenCalled();
  });

  it('falls back to eight hours when a selected 12-hour live range becomes unavailable', () => {
    component.selectedChartRangeHours = 12;
    const detail = {
      ...detailWithTimestamp('2026-10-03T12:00:00.000Z'),
      first_reading_at: '2026-10-03T10:00:00.000Z',
      last_reading_at: '2026-10-03T12:00:00.000Z',
    } as any;

    (component as any).applyLiveMeasurementDetail(detail);

    expect(Number(component.selectedChartRangeHours)).toBe(8);
    expect(monitoringService.readings).not.toHaveBeenCalled();
  });

  it('falls back to eight hours when a selected 24-hour live range becomes unavailable', () => {
    component.selectedChartRangeHours = 24;
    const detail = {
      ...detailWithTimestamp('2026-10-03T12:00:00.000Z'),
      first_reading_at: '2026-10-03T10:00:00.000Z',
      last_reading_at: '2026-10-03T12:00:00.000Z',
    } as any;

    (component as any).applyLiveMeasurementDetail(detail);

    expect(Number(component.selectedChartRangeHours)).toBe(8);
    expect(monitoringService.readings).not.toHaveBeenCalled();
  });

  it('shifts previous and next windows by the selected duration', () => {
    const detail = {
      ...detailWithTimestamp('2026-10-03T22:00:00.000Z'),
      first_reading_at: '2026-10-03T00:00:00.000Z',
    } as any;
    component.detail = detail;
    component.selectedChartRangeHours = 6;
    component.displayedReadings = detail.readings;
    component.displayedRangeFrom = new Date('2026-10-03T10:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');
    monitoringService.readings.and.returnValue(of({ device_id: 'device-1', readings: [] }));

    component.navigateToPreviousChartRange();

    expect(monitoringService.readings).toHaveBeenCalledWith(
      'device-1',
      new Date('2026-10-03T04:00:00.000Z'),
      new Date('2026-10-03T10:00:00.000Z'),
    );

    component.displayedRangeFrom = new Date('2026-10-03T10:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');
    (component as any).historicalChartRange = true;
    component.navigateToNextChartRange();

    expect(monitoringService.readings).toHaveBeenCalledWith(
      'device-1',
      new Date('2026-10-03T16:00:00.000Z'),
      new Date('2026-10-03T22:00:00.000Z'),
    );
  });

  it('requests the previous eight-hour window and keeps the shared chart range', () => {
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: '2026-10-03T00:00:00.000Z',
    } as any;
    component.detail = detail;
    component.displayedReadings = detail.readings;
    component.displayedRangeFrom = new Date('2026-10-03T08:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');
    monitoringService.readings.and.returnValue(of({
      device_id: 'device-1',
      readings: [{ timestamp: '2026-10-03T08:00:00.000Z', T1: 3 }],
    }));

    component.navigateToPreviousChartRange();

    expect(monitoringService.readings).toHaveBeenCalledWith(
      'device-1',
      new Date('2026-10-03T00:00:00.000Z'),
      new Date('2026-10-03T08:00:00.000Z'),
    );
    expect(component.displayedReadings).toEqual([
      { timestamp: '2026-10-03T08:00:00.000Z', T1: 3 },
    ]);
    expect(component.isHistoricalChartRange).toBeTrue();
  });

  it('disables duplicate navigation requests while a range is loading', () => {
    const response = new Subject<any>();
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: '2026-10-03T00:00:00.000Z',
    } as any;
    component.detail = detail;
    component.displayedRangeFrom = new Date('2026-10-03T08:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');
    monitoringService.readings.and.returnValue(response.asObservable());

    component.navigateToPreviousChartRange();
    component.navigateToPreviousChartRange();

    expect(component.displayedRangeLoading).toBeTrue();
    expect(monitoringService.readings).toHaveBeenCalledTimes(1);
    response.next({ device_id: 'device-1', readings: [] });
    expect(component.displayedRangeLoading).toBeFalse();
  });

  it('disables previous navigation when the first reading is at the displayed window start', () => {
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: '2026-10-03T08:00:00.000Z',
    } as any;
    component.detail = detail;
    component.displayedRangeFrom = new Date('2026-10-03T08:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');

    expect(component.previousChartRangeDisabled).toBeTrue();
    component.navigateToPreviousChartRange();

    expect(monitoringService.readings).not.toHaveBeenCalled();
  });

  it('keeps previous navigation enabled when an earlier reading exists', () => {
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: null,
      readings: [
        { timestamp: '2026-10-03T07:59:59.000Z' },
        { timestamp: '2026-10-03T16:00:00.000Z' },
      ],
    } as any;
    component.detail = detail;
    component.displayedRangeFrom = new Date('2026-10-03T08:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');
    monitoringService.readings.and.returnValue(of({ device_id: 'device-1', readings: [] }));

    expect(component.previousChartRangeDisabled).toBeFalse();
    component.navigateToPreviousChartRange();

    expect(monitoringService.readings).toHaveBeenCalledWith(
      'device-1',
      new Date('2026-10-03T00:00:00.000Z'),
      new Date('2026-10-03T08:00:00.000Z'),
    );
  });

  it('disables next when the next eight-hour window would exceed the latest known reading', () => {
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      last_reading_at: '2026-10-03T16:00:00.000Z',
    } as any;
    component.detail = detail;
    component.displayedRangeFrom = new Date('2026-10-03T08:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');

    expect(component.nextChartRangeDisabled).toBeTrue();
    component.navigateToNextChartRange();

    expect(monitoringService.readings).not.toHaveBeenCalled();
  });

  it('preserves a historical displayed range when live polling receives newer metadata', () => {
    const firstDetail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: '2026-10-03T00:00:00.000Z',
      readings: [
        { timestamp: '2026-10-03T08:00:00.000Z', T1: 2 },
        { timestamp: '2026-10-03T16:00:00.000Z', T1: 4 },
      ],
    } as any;
    const historicalReadings = [
      { timestamp: '2026-10-03T00:00:00.000Z', T1: 1 },
    ];
    component.loadLiveMeasurement();
    liveResponses[0].next(firstDetail);
    monitoringService.readings.and.returnValue(of({ device_id: 'device-1', readings: historicalReadings }));
    component.navigateToPreviousChartRange();
    expect(component.displayedReadings).toEqual(historicalReadings);

    component.loadLiveMeasurement();
    const newerDetail = {
      ...firstDetail,
      last_reading_at: '2026-10-03T17:00:00.000Z',
      readings: [{ timestamp: '2026-10-03T17:00:00.000Z', T1: 6 }],
    } as any;
    liveResponses[1].next(newerDetail);

    expect(component.detail).toBe(newerDetail);
    expect(component.displayedReadings).toEqual(historicalReadings);
  });

  it('uses the readings range API for a 12-hour live window without replacing live metadata', () => {
    const rangeResponse = new Subject<any>();
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: '2026-10-03T04:00:00.000Z',
      last_reading_at: '2026-10-03T16:00:00.000Z',
      total_consumption_kwh: 42,
      readings: [{ timestamp: '2026-10-03T16:00:00.000Z', T1: 4 }],
    } as any;
    component.selectedChartRangeHours = 12;
    monitoringService.readings.and.returnValue(rangeResponse.asObservable());

    (component as any).applyLiveMeasurementDetail(detail);

    expect(monitoringService.readings).toHaveBeenCalledWith(
      'device-1',
      new Date('2026-10-03T04:00:00.000Z'),
      new Date('2026-10-03T16:00:00.000Z'),
    );
    expect(component.displayedRangeLoading).toBeTrue();
    expect(component.detail).toBe(detail);
    expect(component.accumulatedConsumptionKwh).toBe(42);

    rangeResponse.next({
      device_id: 'device-1',
      readings: [
        { timestamp: '2026-10-03T04:00:00.000Z', T1: 2 },
        { timestamp: '2026-10-03T16:00:00.000Z', T1: 4 },
      ],
    });

    expect(component.displayedRangeLoading).toBeFalse();
    expect(component.displayedReadings).toHaveSize(2);
    expect(component.detail).toBe(detail);
  });

  it('refreshes the selected 24-hour live window on each live response', () => {
    component.selectedChartRangeHours = 24;
    monitoringService.readings.and.returnValue(of({ device_id: 'device-1', readings: [] }));

    component.loadLiveMeasurement();
    liveResponses[0].next({
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: '2026-10-02T16:00:00.000Z',
      last_reading_at: '2026-10-03T16:00:00.000Z',
    });
    component.loadLiveMeasurement();
    liveResponses[1].next({
      ...detailWithTimestamp('2026-10-03T17:00:00.000Z'),
      first_reading_at: '2026-10-02T17:00:00.000Z',
      last_reading_at: '2026-10-03T17:00:00.000Z',
    });

    expect(monitoringService.readings.calls.allArgs()).toEqual([
      [
        'device-1',
        new Date('2026-10-02T16:00:00.000Z'),
        new Date('2026-10-03T16:00:00.000Z'),
      ],
      [
        'device-1',
        new Date('2026-10-02T17:00:00.000Z'),
        new Date('2026-10-03T17:00:00.000Z'),
      ],
    ]);
  });

  it('returns to the selected live window after historical navigation', () => {
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      last_reading_at: '2026-10-03T16:00:00.000Z',
    } as any;
    const liveRangeReadings = [{ timestamp: '2026-10-03T04:00:00.000Z', T1: 2 }];
    component.detail = detail;
    component.selectedChartRangeHours = 12;
    (component as any).historicalChartRange = true;
    component.displayedRangeFrom = new Date('2026-10-02T16:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T04:00:00.000Z');
    monitoringService.readings.and.returnValue(of({ device_id: 'device-1', readings: liveRangeReadings }));

    component.returnToLatestChartRange();

    expect(component.isHistoricalChartRange).toBeFalse();
    expect(monitoringService.readings).toHaveBeenCalledWith(
      'device-1',
      new Date('2026-10-03T04:00:00.000Z'),
      new Date('2026-10-03T16:00:00.000Z'),
    );
    expect(component.displayedReadings).toEqual(liveRangeReadings);
  });

  it('cancels a pending historical request and ignores its stale response when returning to live', () => {
    const historicalResponse = new Subject<any>();
    const detail = {
      ...detailWithTimestamp('2026-10-03T16:00:00.000Z'),
      first_reading_at: '2026-10-03T00:00:00.000Z',
    } as any;
    const currentReadings = [{ timestamp: '2026-10-03T08:00:00.000Z', T1: 2 }];
    component.detail = detail;
    component.displayedReadings = currentReadings;
    component.displayedRangeFrom = new Date('2026-10-03T08:00:00.000Z');
    component.displayedRangeTo = new Date('2026-10-03T16:00:00.000Z');
    monitoringService.readings.and.returnValue(historicalResponse.asObservable());

    component.navigateToPreviousChartRange();

    expect(component.displayedRangeLoading).toBeTrue();
    expect(component.displayedRangeFrom).toEqual(new Date('2026-10-03T08:00:00.000Z'));
    expect(component.displayedRangeTo).toEqual(new Date('2026-10-03T16:00:00.000Z'));
    expect(component.displayedReadings).toBe(currentReadings);

    component.returnToLatestChartRange();

    expect(component.isHistoricalChartRange).toBeFalse();
    expect(component.displayedRangeLoading).toBeFalse();
    expect(component.displayedRangeFrom).toEqual(new Date('2026-10-03T08:00:00.000Z'));
    expect(component.displayedRangeTo).toEqual(new Date('2026-10-03T16:00:00.000Z'));

    historicalResponse.next({
      device_id: 'device-1',
      readings: [{ timestamp: '2026-10-03T00:00:00.000Z', T1: 99 }],
    });

    expect(component.displayedReadings).toEqual(detail.readings);
    expect(component.displayedReadings).not.toContain(
      jasmine.objectContaining({ timestamp: '2026-10-03T00:00:00.000Z' }),
    );
  });

  it('uses the exact efficiency title and plots only the final 15 minutes', () => {
    const openZoom = spyOn(component, 'openZoom').and.stub();
    const detail = {
      ...detailWithTimestamp('2026-10-03T12:30:00.000Z'),
      readings: [
        { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1 },
        { timestamp: '2026-10-03T12:10:00.000Z', T1: 8, kWh: 2 },
        { timestamp: '2026-10-03T12:20:00.000Z', T1: 6, kWh: 3 },
        { timestamp: '2026-10-03T12:30:00.000Z', T1: 4, kWh: 4 },
      ],
    } as any;

    (component as any).applyLiveMeasurementDetail(detail);
    component.openEfficiencyZoom();

    expect(openZoom.calls.mostRecent().args[0].title).toBe(
      'Índice de eficiencia',
    );
    expect((component.efficiencyChart?.data.labels ?? []).length).toBe(2);
    expect(openZoom.calls.mostRecent().args[0].series[0].label).toBe(
      'Índice de eficiencia (ΔT/kWh)',
    );
  });

  it('keeps full displayed readings for regular charts and only the final 15 minutes for IE', () => {
    const detail = {
      ...detailWithTimestamp('2026-10-03T12:30:00.000Z'),
      readings: [
        { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1, A: 1 },
        { timestamp: '2026-10-03T12:10:00.000Z', T1: 8, kWh: 2, A: 2 },
        { timestamp: '2026-10-03T12:20:00.000Z', T1: 6, kWh: 3, A: 3 },
        { timestamp: '2026-10-03T12:30:00.000Z', T1: 4, kWh: 4, A: 4 },
      ],
    } as any;

    (component as any).applyLiveMeasurementDetail(detail);

    expect((component.mainChart?.data.labels ?? []).length).toBe(4);
    expect((component.efficiencyChart?.data.labels ?? []).length).toBe(2);
  });
});
