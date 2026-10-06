import { fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { MonitoringAuthService } from '../monitoring-auth.service';
import { DeviceOverviewItem, DeviceOverviewPage } from '../monitoring.models';
import { MonitoringService } from '../monitoring.service';
import { MonitoringDashboardComponent } from './monitoring-dashboard.component';

describe('MonitoringDashboardComponent', () => {
  let component: MonitoringDashboardComponent;
  let overviewRequests: Subject<DeviceOverviewPage>[];
  let monitoringService: jasmine.SpyObj<MonitoringService>;

  const emptyOverview = (): DeviceOverviewPage => ({
    page: 1,
    page_size: 10,
    total: 0,
    items: [],
  });

  beforeEach(() => {
    overviewRequests = [];
    monitoringService = jasmine.createSpyObj<MonitoringService>('MonitoringService', ['overview']);
    monitoringService.overview.and.callFake(() => {
      const request = new Subject<DeviceOverviewPage>();
      overviewRequests.push(request);
      return request.asObservable();
    });

    const authService = {
      currentSession: { token: 'token' },
    } as MonitoringAuthService;
    component = new MonitoringDashboardComponent(
      authService,
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
    expect((component.chartByDevice['COLD-004-TEST'].options as any).animation).toEqual({
      duration: 700,
      easing: 'easeOutCubic',
    });

    (component as any).startPolling();
    tick(8000);

    expect(monitoringService.overview).toHaveBeenCalledTimes(2);
    expect(component.loading).toBeTrue();
    expect(component.showClientChangeSkeleton).toBeFalse();
    expect(component.items).toEqual([liveItem]);
    expect(component.chartByDevice['COLD-004-TEST']).toBeDefined();

    overviewRequests[1].next({
      ...emptyOverview(),
      total: 1,
      items: [liveItem],
    });

    expect(component.loading).toBeFalse();
    expect(component.items).toEqual([liveItem]);
    expect(component.chartByDevice['COLD-004-TEST']).toBeDefined();
    expect((component.chartByDevice['COLD-004-TEST'].options as any).animation).toBeFalse();

    overviewRequests[1].next({
      ...emptyOverview(),
      total: 1,
      items: [
        {
          ...liveItem,
          last_reading_at: '2026-10-03T12:00:08.000Z',
          readings: [
            { timestamp: '2026-10-03T12:00:08.000Z', T1: 4.6 },
          ],
        },
      ],
    });

    expect((component.chartByDevice['COLD-004-TEST'].options as any).animation).toEqual({
      duration: 700,
      easing: 'easeOutCubic',
    });

    component.ngOnDestroy();
  }));
});
