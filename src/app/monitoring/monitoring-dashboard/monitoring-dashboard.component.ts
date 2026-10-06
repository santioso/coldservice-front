import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Subscription, interval } from 'rxjs';
import { MonitoringAuthService } from '../monitoring-auth.service';
import { buildDualAxisChart } from '../monitoring-chart.util';
import {
  DeviceOverviewItem,
  DeviceSortMode,
  MonitoringClient,
} from '../monitoring.models';
import { MonitoringService } from '../monitoring.service';

export type MonitoringClientFilter = 'all' | 'unassigned' | number;

@Component({
  selector: 'app-monitoring-dashboard',
  templateUrl: './monitoring-dashboard.component.html',
  styleUrls: ['./monitoring-dashboard.component.scss'],
})
export class MonitoringDashboardComponent implements OnInit, OnDestroy {
  items: DeviceOverviewItem[] = [];
  chartByDevice: Record<string, ChartConfiguration<'line'>> = {};
  page = 1;
  pageSize = 10;
  total = 0;
  sort: DeviceSortMode = 'serial_asc';
  clients: MonitoringClient[] = [];
  clientFilter: MonitoringClientFilter = 'all';
  viewMode: 'charts' | 'table' = 'charts';
  readonly pageSizeOptions = [6, 10, 14, 20];
  readonly sortOptions: Array<{ value: DeviceSortMode; label: string }> = [
    { value: 'latest', label: 'Última lectura' },
    { value: 'serial_asc', label: 'Serial A-Z' },
    { value: 'serial_desc', label: 'Serial Z-A' },
    { value: 'model_asc', label: 'Modelo A-Z' },
    { value: 'custom', label: 'Orden personalizado' },
  ];
  loading = false;
  showClientChangeSkeleton = false;
  hasLoadedOverview = false;
  error = '';
  private pollingSubscription: Subscription | null = null;
  private overviewSubscription: Subscription | null = null;
  private customOrder: string[] = [];
  private overviewRequestGeneration = 0;
  private lastRenderedLatestReadingByDevice = new Map<string, string | null>();

  // Alarma global
  globalAlarm: 'low_alarm' | 'high_alarm' | null = null;
  soundEnabled = true;
  private previousAlarmingDevices = new Set<string>();
  private audioCtx: AudioContext | null = null;

  constructor(
    public readonly authService: MonitoringAuthService,
    private readonly monitoringService: MonitoringService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.customOrder = this.readCustomOrder();
    this.soundEnabled = this.readSoundPreference();
    this.loadClients();
    this.loadOverview();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
    this.overviewSubscription?.unsubscribe();
    this.audioCtx?.close();
  }

  logout(): void {
    this.authService.logout();
  }

  loadOverview(): void {
    this.overviewSubscription?.unsubscribe();
    const requestGeneration = ++this.overviewRequestGeneration;
    if (!this.hasLoadedOverview) {
      this.showClientChangeSkeleton = true;
    }
    this.loading = true;
    this.error = '';
    this.overviewSubscription = this.monitoringService
      .overview(
        this.page,
        this.pageSize,
        this.sort,
        this.customOrder,
        String(this.clientFilter),
      )
      .subscribe({
        next: (response) => {
          if (requestGeneration !== this.overviewRequestGeneration) return;
          const liveItems = response.items.filter((item) => item.is_live === true);
          this.items = liveItems;
          this.total = response.total;
          this.page = response.page;
          this.pageSize = response.page_size;
          this.chartByDevice = {};
          for (const item of liveItems) {
            const latestReadingTimestamp =
              item.last_reading_at ??
              item.readings[item.readings.length - 1]?.timestamp ??
              null;
            const hasRenderedReading = this.lastRenderedLatestReadingByDevice.has(
              item.device_id,
            );
            const animateOnUpdate =
              !hasRenderedReading ||
              this.lastRenderedLatestReadingByDevice.get(item.device_id) !==
                latestReadingTimestamp;
            this.chartByDevice[item.device_id] = buildDualAxisChart(item.readings, {
              lowerLimit: item.limite_inferior_celsius,
              upperLimit: item.limite_superior_celsius,
              animateOnUpdate,
            });
            this.lastRenderedLatestReadingByDevice.set(
              item.device_id,
              latestReadingTimestamp,
            );
          }
          this.evaluateAlarms(liveItems);
          this.hasLoadedOverview = true;
          this.loading = false;
          this.showClientChangeSkeleton = false;
          this.overviewSubscription = null;
        },
        error: () => {
          if (requestGeneration !== this.overviewRequestGeneration) return;
          if (!this.authService.currentSession?.token) {
            this.pollingSubscription?.unsubscribe();
          }
          this.error = 'No fue posible cargar el panel de dispositivos';
          this.loading = false;
          this.showClientChangeSkeleton = false;
          this.overviewSubscription = null;
        },
      });
  }

  onPageSizeChange(value: number): void {
    this.pageSize = value;
    this.page = 1;
    this.loadOverview();
  }

  onSortChange(value: DeviceSortMode): void {
    this.sort = value;
    this.page = 1;
    this.loadOverview();
  }

  onClientFilterChange(value: MonitoringClientFilter): void {
    this.clientFilter = value;
    this.page = 1;
    this.showClientChangeSkeleton = true;
    this.clearOverviewData();
    this.loadOverview();
  }

  setViewMode(viewMode: 'charts' | 'table'): void {
    this.viewMode = viewMode;
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadOverview();
  }

  openDevice(deviceId: string): void {
    this.router.navigate(['/monitoring/devices', deviceId]);
  }

  openHistory(): void {
    this.router.navigate(['/monitoring/historicos']);
  }

  moveDevice(deviceId: string, direction: -1 | 1): void {
    const ids = this.customOrder.length
      ? [...this.customOrder]
      : this.items.map((item) => item.device_id);
    const index = ids.indexOf(deviceId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.customOrder = ids;
    this.persistCustomOrder();
    this.sort = 'custom';
    this.loadOverview();
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    if (!this.soundEnabled) {
      this.stopContinuousSound();
    }
    this.persistSoundPreference();
  }

  formatTime(timestamp: string | null | undefined): string {
    return timestamp ? new Date(timestamp).toLocaleString() : 'Sin lecturas';
  }

  formatTemperature(value: number | undefined): string {
    return typeof value === 'number' ? `${value.toFixed(1)} °C` : '—';
  }

  latestTemperature(item: DeviceOverviewItem): number | undefined {
    return item.readings[item.readings.length - 1]?.T1;
  }

  formatAllowedRange(item: DeviceOverviewItem): string {
    const lower = item.limite_inferior_celsius;
    const upper = item.limite_superior_celsius;
    if (lower == null && upper == null) return '—';
    return `${lower ?? '—'} a ${upper ?? '—'} °C`;
  }

  formatAlarmStatus(status: DeviceOverviewItem['alarm_status']): string {
    if (status === 'low_alarm') return 'Alarma baja';
    if (status === 'high_alarm') return 'Alarma alta';
    return 'Sin alerta';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get alarmingDeviceCount(): number {
    return this.items.filter((item) => item.alarm_status !== 'ok').length;
  }

  get alarmingDevices(): DeviceOverviewItem[] {
    return this.items.filter((item) => item.alarm_status !== 'ok');
  }

  private evaluateAlarms(items: DeviceOverviewItem[]): void {
    // Determinar alarma global
    const highAlarm = items.find((item) => item.alarm_status === 'high_alarm');
    const lowAlarm = items.find((item) => item.alarm_status === 'low_alarm');
    this.globalAlarm = highAlarm ? 'high_alarm' : lowAlarm ? 'low_alarm' : null;

    const currentAlarming = new Set(
      items
        .filter((item) => item.alarm_status !== 'ok')
        .map((item) => item.device_id),
    );

    // Sonido continuo mientras haya alarmas activas y sonido activado
    if (currentAlarming.size > 0 && this.soundEnabled) {
      this.startContinuousSound();
    } else {
      this.stopContinuousSound();
    }
  }

  private continuousSoundNodes: { oscillator: OscillatorNode; gain: GainNode }[] | null = null;

  private startContinuousSound(): void {
    if (this.continuousSoundNodes) return; // ya reproduciendo
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.15, this.audioCtx.currentTime);

      // Segundo tono intermitente
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, this.audioCtx.currentTime);
      gain2.gain.setValueAtTime(0, this.audioCtx.currentTime);

      // Alternar segundo tono cada 500ms
      const intervalId = setInterval(() => {
        if (!this.soundEnabled || !this.globalAlarm) {
          clearInterval(intervalId);
          return;
        }
        const now = this.audioCtx!.currentTime;
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      }, 600);

      osc1.start();
      osc2.start();

      this.continuousSoundNodes = [
        { oscillator: osc1, gain: gain1 },
        { oscillator: osc2, gain: gain2 },
      ];

      // Guardar referencia para limpiar el interval
      (this as any).__alarmInterval = intervalId;
    } catch {
      // Silently fail
    }
  }

  private stopContinuousSound(): void {
    if (this.continuousSoundNodes) {
      for (const node of this.continuousSoundNodes) {
        try {
          node.oscillator.stop();
          node.oscillator.disconnect();
          node.gain.disconnect();
        } catch { /* ignore */ }
      }
      this.continuousSoundNodes = null;
    }
    const intervalId = (this as any).__alarmInterval;
    if (intervalId) {
      clearInterval(intervalId);
      (this as any).__alarmInterval = null;
    }
  }

  private startPolling(): void {
    this.pollingSubscription = interval(8000).subscribe(() => {
      if (
        this.loading ||
        (this.overviewSubscription !== null && !this.overviewSubscription.closed)
      ) {
        return;
      }
      this.loadOverview();
    });
  }

  private clearOverviewData(): void {
    this.items = [];
    this.chartByDevice = {};
    this.lastRenderedLatestReadingByDevice.clear();
    this.total = 0;
    this.hasLoadedOverview = false;
    this.globalAlarm = null;
    this.previousAlarmingDevices.clear();
    this.stopContinuousSound();
  }

  private loadClients(): void {
    this.monitoringService.clients().subscribe({
      next: (clients) => {
        this.clients = clients;
      },
    });
  }

  private readCustomOrder(): string[] {
    const clientId = this.authService.currentSession?.user.client_id;
    if (!clientId) return [];
    const raw = localStorage.getItem(`monitoringDeviceOrder-${clientId}`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistCustomOrder(): void {
    const clientId = this.authService.currentSession?.user.client_id;
    if (!clientId) return;
    localStorage.setItem(
      `monitoringDeviceOrder-${clientId}`,
      JSON.stringify(this.customOrder),
    );
  }

  private readSoundPreference(): boolean {
    const clientId = this.authService.currentSession?.user.client_id;
    if (!clientId) return true;
    return localStorage.getItem(`monitoringSoundEnabled-${clientId}`) !== 'false';
  }

  private persistSoundPreference(): void {
    const clientId = this.authService.currentSession?.user.client_id;
    if (!clientId) return;
    localStorage.setItem(
      `monitoringSoundEnabled-${clientId}`,
      String(this.soundEnabled),
    );
  }
}
