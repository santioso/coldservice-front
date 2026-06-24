import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Subscription, interval } from 'rxjs';
import {
  MonitoringZoomChartDialogComponent,
  ZoomChartDialogData,
} from '../monitoring-zoom-chart-dialog.component';
import {
  buildDualAxisChart,
  buildMultiSeriesChart,
  computeDeltaTCond,
  computeDeltaTEvap,
  computeEfficiencyIndex,
  computePower,
} from '../monitoring-chart.util';
import {
  MeasurementSessionDetail,
  MeasurementSessionSummary,
} from '../monitoring.models';
import { MonitoringService } from '../monitoring.service';

type ChartsPerRow = 1 | 2 | 3 | 4;
const CHARTS_PER_ROW_STORAGE_KEY = 'monitoring-device-charts-per-row';
const LARGE_SCREEN_MIN_WIDTH = 960;

@Component({
  selector: 'app-monitoring-device-detail',
  templateUrl: './monitoring-device-detail.component.html',
  styleUrls: ['./monitoring-device-detail.component.scss'],
})
export class MonitoringDeviceDetailComponent implements OnInit, OnDestroy {
  deviceId = '';
  sessions: MeasurementSessionSummary[] = [];
  detail: MeasurementSessionDetail | null = null;
  loading = false;
  error = '';
  mainChart: ChartConfiguration<'line'> | null = null;
  tempsChart: ChartConfiguration<'line'> | null = null;
  electricalChart: ChartConfiguration<'line'> | null = null;
  deltaChart: ChartConfiguration<'line'> | null = null;
  powerChart: ChartConfiguration<'line'> | null = null;
  efficiencyChart: ChartConfiguration<'line'> | null = null;
  consumptionChart: ChartConfiguration<'line'> | null = null;
  readonly chartsPerRowOptions: ChartsPerRow[] = [1, 2, 3, 4];
  chartsPerRow: ChartsPerRow = 2;
  private savedChartsPerRow: ChartsPerRow | null = null;
  private pollingSubscription: Subscription | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly monitoringService: MonitoringService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('deviceId') ?? '';
    this.loadChartsPerRowPreference();
    this.loadSessions();
    this.startPolling();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.savedChartsPerRow != null) {
      return;
    }
    this.chartsPerRow = this.defaultChartsPerRow();
  }

  onChartsPerRowChange(value: ChartsPerRow | string | null): void {
    const parsed = Number(value);
    if (![1, 2, 3, 4].includes(parsed)) {
      return;
    }
    this.setChartsPerRow(parsed as ChartsPerRow);
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  backToPanel(): void {
    this.router.navigate(['/monitoring/dashboard']);
  }

  loadSessions(): void {
    this.loading = true;
    this.error = '';
    this.monitoringService.sessions(this.deviceId).subscribe({
      next: ({ sessions }) => {
        this.sessions = sessions;
        const live = sessions.find((session) => session.is_live);
        const selected = live ?? sessions[0];
        if (selected) {
          this.loadSession(selected.session_id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.error = 'No fue posible cargar las sesiones del dispositivo';
        this.loading = false;
      },
    });
  }

  loadSession(sessionId: number): void {
    this.loading = true;
    this.monitoringService.session(this.deviceId, sessionId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.buildCharts(detail);
        this.loading = false;
      },
      error: () => {
        this.error = 'No fue posible cargar la sesión seleccionada';
        this.loading = false;
      },
    });
  }

  openZoom(data: ZoomChartDialogData): void {
    this.dialog.open(MonitoringZoomChartDialogComponent, {
      width: '95vw',
      maxWidth: '1200px',
      data,
    });
  }

  openMainZoom(): void {
    if (!this.detail) return;
    this.openZoom({
      title: 'Corriente vs temp. gabinete',
      mode: 'dual',
      readings: this.detail.readings,
    });
  }

  openTempsZoom(): void {
    if (!this.detail) return;
    this.openZoom({
      title: 'Temperaturas',
      mode: 'multi',
      readings: this.detail.readings,
      series: [
        { label: 'Gabinete', color: '#0057b8', value: (r) => r.T1 },
        { label: 'Evaporador', color: '#16a34a', value: (r) => r.T2 },
        { label: 'Ambiente', color: '#f59e0b', value: (r) => r.T3 },
        { label: 'Condensador', color: '#dc2626', value: (r) => r.T4 },
      ],
    });
  }

  openElectricalZoom(): void {
    if (!this.detail) return;
    this.openZoom({
      title: 'Variables eléctricas',
      mode: 'multi',
      readings: this.detail.readings,
      series: [
        { label: 'V', color: '#2563eb', value: (r) => r.V },
        { label: 'A', color: '#ff8f00', value: (r) => r.A },
        { label: 'W', color: '#7c3aed', value: (r) => computePower(r) },
      ],
    });
  }

  openDeltaZoom(): void {
    if (!this.detail) return;
    this.openZoom({
      title: 'Eficiencia de intercambio',
      mode: 'multi',
      readings: this.detail.readings,
      series: [
        {
          label: 'Delta T evaporación',
          color: '#4f46e5',
          value: (r) => computeDeltaTEvap(r),
        },
        {
          label: 'Delta T condensación',
          color: '#ea580c',
          value: (r) => computeDeltaTCond(r),
        },
      ],
    });
  }

  openPowerZoom(): void {
    if (!this.detail) return;
    this.openZoom({
      title: 'Consumo específico (W)',
      mode: 'multi',
      readings: this.detail.readings,
      series: [{ label: 'W', color: '#0f766e', value: (r) => computePower(r) }],
    });
  }

  openEfficiencyZoom(): void {
    if (!this.detail) return;
    const efficiencyValues = computeEfficiencyIndex(this.detail.readings);
    this.openZoom({
      title: 'Índice de eficiencia',
      mode: 'multi',
      readings: this.detail.readings,
      series: [
        {
          label: 'ΔT/kWh',
          color: '#0d9488',
          value: (reading) => {
            const index = this.detail!.readings.indexOf(reading);
            return efficiencyValues[index];
          },
        },
      ],
    });
  }

  openConsumptionZoom(): void {
    if (!this.detail) return;
    this.openZoom({
      title: 'Análisis de consumo (kWh)',
      mode: 'multi',
      readings: this.detail.readings,
      series: [{ label: 'kWh', color: '#c2410c', value: (r) => r.kWh }],
    });
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString() : '--';
  }

  private startPolling(): void {
    this.pollingSubscription = interval(8000).subscribe(() => {
      if (!this.detail?.is_live) return;
      this.loadSession(this.detail.session_id);
    });
  }

  private loadChartsPerRowPreference(): void {
    const raw = localStorage.getItem(CHARTS_PER_ROW_STORAGE_KEY);
    const parsed = Number(raw);
    if ([1, 2, 3, 4].includes(parsed)) {
      this.savedChartsPerRow = parsed as ChartsPerRow;
      this.chartsPerRow = this.savedChartsPerRow;
      return;
    }
    this.chartsPerRow = this.defaultChartsPerRow();
  }

  private setChartsPerRow(value: ChartsPerRow): void {
    this.chartsPerRow = value;
    this.savedChartsPerRow = value;
    localStorage.setItem(CHARTS_PER_ROW_STORAGE_KEY, String(value));
  }

  private defaultChartsPerRow(): ChartsPerRow {
    if (typeof globalThis.window === 'undefined') {
      return 2;
    }
    return globalThis.window.innerWidth >= LARGE_SCREEN_MIN_WIDTH ? 2 : 1;
  }

  private buildCharts(detail: MeasurementSessionDetail): void {
    const readings = detail.readings;
    this.mainChart = buildDualAxisChart(readings);
    this.tempsChart = buildMultiSeriesChart(readings, [
      { label: 'Gabinete', color: '#0057b8', value: (r) => r.T1 },
      { label: 'Evaporador', color: '#16a34a', value: (r) => r.T2 },
      { label: 'Ambiente', color: '#f59e0b', value: (r) => r.T3 },
      { label: 'Condensador', color: '#dc2626', value: (r) => r.T4 },
    ]);
    this.electricalChart = buildMultiSeriesChart(readings, [
      { label: 'V', color: '#2563eb', value: (r) => r.V },
      { label: 'A', color: '#ff8f00', value: (r) => r.A },
      { label: 'W', color: '#7c3aed', value: (r) => computePower(r) },
    ]);
    this.deltaChart = buildMultiSeriesChart(readings, [
      {
        label: 'Delta T evaporación',
        color: '#4f46e5',
        value: (r) => computeDeltaTEvap(r),
      },
      {
        label: 'Delta T condensación',
        color: '#ea580c',
        value: (r) => computeDeltaTCond(r),
      },
    ]);
    this.powerChart = buildMultiSeriesChart(readings, [
      { label: 'W', color: '#0f766e', value: (r) => computePower(r) },
    ]);
    const efficiencyValues = computeEfficiencyIndex(readings);
    this.efficiencyChart = buildMultiSeriesChart(readings, [
      {
        label: 'ΔT/kWh',
        color: '#0d9488',
        value: (reading) => {
          const index = readings.indexOf(reading);
          return efficiencyValues[index];
        },
      },
    ]);
    this.consumptionChart = buildMultiSeriesChart(readings, [
      { label: 'kWh', color: '#c2410c', value: (r) => r.kWh },
    ]);
  }
}
