import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Subscription, interval, startWith } from 'rxjs';
import { MonitoringAuthService } from '../monitoring-auth.service';
import { buildDualAxisChart } from '../monitoring-chart.util';
import {
  DeviceOverviewItem,
  DeviceSortMode,
  MonitoringDevice,
} from '../monitoring.models';
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
  readonly deviceSearch = new FormControl<string | MonitoringDevice>('');
  devices: MonitoringDevice[] = [];
  filteredDevices: MonitoringDevice[] = [];
  private pollingSubscription: Subscription | null = null;
  private deviceSearchSubscription: Subscription | null = null;
  private customOrder: string[] = [];

  constructor(
    public readonly authService: MonitoringAuthService,
    private readonly monitoringService: MonitoringService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.customOrder = this.readCustomOrder();
    this.loadDevices();
    this.deviceSearchSubscription = this.deviceSearch.valueChanges
      .pipe(startWith(''))
      .subscribe((value) => this.applyDeviceFilter(value));
    this.loadOverview();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
    this.deviceSearchSubscription?.unsubscribe();
  }

  displayDevice(device: MonitoringDevice | null): string {
    if (!device) {
      return '';
    }
    return device.modelo
      ? `${device.device_id} · ${device.modelo}`
      : device.device_id;
  }

  onDeviceSelected(event: MatAutocompleteSelectedEvent): void {
    const device = event.option.value as MonitoringDevice;
    if (!device?.device_id) {
      return;
    }
    this.openDevice(device.device_id);
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
          this.items = response.items;
          this.total = response.total;
          this.page = response.page;
          this.pageSize = response.page_size;
          this.chartByDevice = {};
          for (const item of response.items) {
            this.chartByDevice[item.device_id] = buildDualAxisChart(item.readings);
          }
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

  formatTime(timestamp: string | null | undefined): string {
    return timestamp ? new Date(timestamp).toLocaleString() : 'Sin lecturas';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  private startPolling(): void {
    this.pollingSubscription = interval(8000).subscribe(() => {
      this.loadOverview();
    });
  }

  private loadDevices(): void {
    this.monitoringService.devices().subscribe({
      next: (devices) => {
        this.devices = [...devices].sort((left, right) =>
          left.device_id.localeCompare(right.device_id, 'es', {
            sensitivity: 'base',
          }),
        );
        this.applyDeviceFilter(this.deviceSearch.value);
      },
    });
  }

  private applyDeviceFilter(
    value: string | MonitoringDevice | null | undefined,
  ): void {
    const query =
      typeof value === 'string'
        ? value.trim().toLowerCase()
        : value?.device_id?.toLowerCase() ?? '';

    if (!query) {
      this.filteredDevices = [...this.devices];
      return;
    }

    this.filteredDevices = this.devices.filter((device) => {
      const serial = device.device_id.toLowerCase();
      const model = device.modelo?.toLowerCase() ?? '';
      return serial.includes(query) || model.includes(query);
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
}
