import { fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { MonitoringAuthService } from '../monitoring-auth.service';
import { DeviceOverviewItem, DeviceOverviewPage } from '../monitoring.models';
import { MonitoringService } from '../monitoring.service';
import { MonitoringDashboardComponent } from './monitoring-dashboard.component';

describe('MonitoringDashboardComponent', () => {
  let component: MonitoringDashboardComponent;
  let overviewRequests: Subject<DeviceOverviewPage>[];
  let monitoringService: jasmine.SpyObj<MonitoringService>;
  let authService: { currentSession: any };

  const emptyOverview = (): DeviceOverviewPage => ({
    page: 1,
    page_size: 10,
    total: 0,
    items: [],
  });

  beforeEach(() => {
    overviewRequests = [];
    monitoringService = jasmine.createSpyObj<MonitoringService>('MonitoringService', [
      'clients',
      'overview',
    ]);
    monitoringService.clients.and.returnValue(of([]));
    monitoringService.overview.and.callFake(() => {
      const request = new Subject<DeviceOverviewPage>();
      overviewRequests.push(request);
      return request.asObservable();
    });

    authService = {
      currentSession: { token: 'token' },
    };
    component = new MonitoringDashboardComponent(
      authService as MonitoringAuthService,
      monitoringService,
      {} as Router,
    );
  });

  it('keeps the selected client value and ignores an obsolete overview response', () => {
    component.loadOverview();
    component.onClientFilterChange(42);

    expect(component.clientFilter).toBe(42);
    expect(component.loading).toBeTrue();
    expect(component.showClientChangeSkeleton).toBeTrue();
    expect(component.items).toEqual([]);
    expect(overviewRequests[0].observers.length).toBe(0);

    overviewRequests[0].next({ ...emptyOverview(), total: 99 });
    expect(component.loading).toBeTrue();
    expect(component.total).toBe(0);

    overviewRequests[1].next(emptyOverview());
    expect(component.loading).toBeFalse();
    expect(component.showClientChangeSkeleton).toBeFalse();
    expect(component.hasLoadedOverview).toBeTrue();
    expect(component.total).toBe(0);
  });

  it('shows the skeleton before the initial response', () => {
    component.loadOverview();

    expect(component.loading).toBeTrue();
    expect(component.showClientChangeSkeleton).toBeTrue();
    expect(component.hasLoadedOverview).toBeFalse();
    expect(component.items).toEqual([]);

    overviewRequests[0].next(emptyOverview());

    expect(component.loading).toBeFalse();
    expect(component.hasLoadedOverview).toBeTrue();
    expect(component.showClientChangeSkeleton).toBeFalse();
  });

  it('serializes numeric client selections for the backend without changing the bound value', () => {
    component.onClientFilterChange(7);

    expect(monitoringService.overview).toHaveBeenCalledWith(1, 10, 'serial_asc', [], '7');
    expect(component.clientFilter).toBe(7);
  });

  it('restores the table view for the authenticated monitoring user during initialization', () => {
    authService.currentSession = {
      token: 'token',
      user: { id: 7, client_id: 11 },
    };
    localStorage.setItem('monitoringViewMode-7', 'table');

    component.ngOnInit();

    expect(component.viewMode).toBe('table');
    component.ngOnDestroy();
  });

  it('restores the charts view for the authenticated monitoring user during initialization', () => {
    authService.currentSession = {
      token: 'token',
      user: { id: 7, client_id: 11 },
    };
    localStorage.setItem('monitoringViewMode-7', 'charts');

    component.ngOnInit();

    expect(component.viewMode).toBe('charts');
    component.ngOnDestroy();
  });

  it('persists view changes under the authenticated monitoring user id', () => {
    authService.currentSession = {
      token: 'token',
      user: { id: 7, client_id: 11 },
    };

    component.setViewMode('table');

    expect(localStorage.getItem('monitoringViewMode-7')).toBe('table');
    expect(localStorage.getItem('monitoringViewMode-11')).toBeNull();
  });

  it('defaults to charts without a complete monitoring session', () => {
    component.ngOnInit();

    expect(component.viewMode).toBe('charts');
    component.ngOnDestroy();
  });

  it('stops showing the loading skeleton when the overview request fails', () => {
    component.onClientFilterChange(42);

    expect(component.loading).toBeTrue();
    expect(component.showClientChangeSkeleton).toBeTrue();
    overviewRequests[0].error(new Error('network failure'));

    expect(component.loading).toBeFalse();
    expect(component.showClientChangeSkeleton).toBeFalse();
    expect(component.error).toBe('No fue posible cargar el panel de dispositivos');
  });

  it('keeps existing items visible while polling refreshes them', fakeAsync(() => {
    const liveItem = {
      id: 1,
      device_id: 'COLD-004-TEST',
      modelo: 'Test device',
      activo: true,
      activo_id: 'ACT-004',
      is_live: true,
      last_reading_at: '2026-10-03T12:00:00.000Z',
      readings: [{ timestamp: '2026-10-03T12:00:00.000Z', T1: 4.5 }],
      limite_inferior_celsius: 0,
      limite_superior_celsius: 8,
      alarm_status: 'ok',
      notifications_enabled: false,
    } as DeviceOverviewItem;

    component.loadOverview();
    overviewRequests[0].next({
      ...emptyOverview(),
      total: 1,
      items: [liveItem],
    });

    expect(component.loading).toBeFalse();
    expect(component.showClientChangeSkeleton).toBeFalse();
    expect(component.items).toEqual([liveItem]);
    expect(component.chartByDevice['COLD-004-TEST']).toBeDefined();
    const initialChart = component.chartByDevice['COLD-004-TEST'];
    expect((component.chartByDevice['COLD-004-TEST'].options as any).animation).toEqual({
      duration: 700,
      easing: 'easeOutCubic',
    });

    (component as any).startPolling();
    tick(30000);

    expect(monitoringService.overview).toHaveBeenCalledTimes(2);
    expect(component.loading).toBeTrue();
    expect(component.refreshing).toBeTrue();
    expect(component.showClientChangeSkeleton).toBeFalse();
    expect(component.items).toEqual([liveItem]);
    expect(component.chartByDevice['COLD-004-TEST']).toBeDefined();

    overviewRequests[1].next({
      ...emptyOverview(),
      total: 1,
      items: [liveItem],
    });

    expect(component.loading).toBeFalse();
    expect(component.refreshing).toBeFalse();
    expect(component.items).toEqual([liveItem]);
    expect(component.chartByDevice['COLD-004-TEST']).toBe(initialChart);
    expect((component.chartByDevice['COLD-004-TEST'].options as any).animation).toEqual({
      duration: 700,
      easing: 'easeOutCubic',
    });

    const updatedLiveItem = {
      ...liveItem,
      last_reading_at: '2026-10-03T12:00:08.000Z',
      readings: [
        { timestamp: '2026-10-03T12:00:08.000Z', T1: 4.6 },
      ],
    } as DeviceOverviewItem;
    overviewRequests[1].next({
      ...emptyOverview(),
      total: 1,
      items: [updatedLiveItem],
    });

    expect(component.chartByDevice['COLD-004-TEST']).not.toBe(initialChart);
    expect((component.chartByDevice['COLD-004-TEST'].options as any).animation).toEqual({
      duration: 700,
      easing: 'easeOutCubic',
    });

    component.loadOverview(true);
    expect(component.refreshing).toBeTrue();
    overviewRequests[2].error(new Error('network failure'));

    expect(component.refreshing).toBeFalse();
    expect(component.items).toEqual([updatedLiveItem]);

    component.ngOnDestroy();
  }));
});
