import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Subscription, interval } from 'rxjs';
import { MonitoringAuthService } from '../monitoring-auth.service';
import { buildDualAxisChart } from '../monitoring-chart.util';
import { DeviceOverviewItem, DeviceSortMode } from '../monitoring.models';
import { MonitoringService } from '../monitoring.service';

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
  sort: DeviceSortMode = 'latest';
  readonly pageSizeOptions = [6, 10, 14, 20];
  readonly sortOptions: Array<{ value: DeviceSortMode; label: string }> = [
    { value: 'latest', label: 'Última lectura' },
    { value: 'serial_asc', label: 'Serial A-Z' },
    { value: 'serial_desc', label: 'Serial Z-A' },
    { value: 'model_asc', label: 'Modelo A-Z' },
    { value: 'custom', label: 'Orden personalizado' },
  ];
  loading = false;
  error = '';
  private pollingSubscription: Subscription | null = null;
  private customOrder: string[] = [];

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
    this.loadOverview();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
    this.audioCtx?.close();
  }

  logout(): void {
    this.authService.logout();
  }

  loadOverview(): void {
    this.loading = true;
    this.error = '';
    this.monitoringService
      .overview(this.page, this.pageSize, this.sort, this.customOrder)
      .subscribe({
        next: (response) => {
          const liveItems = response.items.filter((item) => item.is_live === true);
          this.items = liveItems;
          this.total = response.total;
          this.page = response.page;
          this.pageSize = response.page_size;
          this.chartByDevice = {};
          for (const item of liveItems) {
            this.chartByDevice[item.device_id] = buildDualAxisChart(item.readings, {
              lowerLimit: item.limite_inferior_celsius,
              upperLimit: item.limite_superior_celsius,
            });
          }
          this.evaluateAlarms(liveItems);
          this.loading = false;
        },
        error: () => {
          this.error = 'No fue posible cargar el panel de dispositivos';
          this.loading = false;
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

    // Detectar NUEVAS alarmas para reproducir sonido
    const currentAlarming = new Set(
      items
        .filter((item) => item.alarm_status !== 'ok')
        .map((item) => item.device_id),
    );

    const newAlarms: string[] = [];
    for (const deviceId of currentAlarming) {
      if (!this.previousAlarmingDevices.has(deviceId)) {
        newAlarms.push(deviceId);
      }
    }

    this.previousAlarmingDevices = currentAlarming;

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
      this.loadOverview();
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
