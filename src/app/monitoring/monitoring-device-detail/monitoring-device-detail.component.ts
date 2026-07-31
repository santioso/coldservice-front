import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Observable, Subscription, forkJoin, interval } from 'rxjs';
import {
  MonitoringActivoDialogComponent,
  ActivoDialogResult,
} from '../monitoring-activo-dialog.component';
import {
  MonitoringClienteDialogComponent,
  ClienteDialogResult,
} from '../monitoring-cliente-dialog.component';
import {
  MonitoringTecnicoDialogComponent,
  TecnicoDialogResult,
  TecnicoDialogData,
} from '../monitoring-tecnico-dialog.component';
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
  MonitoringChartOptions,
} from '../monitoring-chart.util';
import {
  MeasurementSessionDetail,
} from '../monitoring.models';
import { MonitoringService } from '../monitoring.service';

type ChartsPerRow = 1 | 2 | 3 | 4;
const CHARTS_PER_ROW_STORAGE_KEY = 'monitoring-device-charts-per-row';
const LARGE_SCREEN_MIN_WIDTH = 960;
const LIVE_LINE_OPTIONS: MonitoringChartOptions = { pointRadius: 0 };

@Component({
  selector: 'app-monitoring-device-detail',
  templateUrl: './monitoring-device-detail.component.html',
  styleUrls: ['./monitoring-device-detail.component.scss'],
})
export class MonitoringDeviceDetailComponent implements OnInit, OnDestroy {
  deviceId = '';
  detail: MeasurementSessionDetail | null = null;
  noLiveMeasurement = false;
  loading = false;
  error = '';
  editingCard: 'cliente' | 'activo' | 'tecnico' | null = null;
  togglingNotifications = false;
  mainChart: ChartConfiguration<'line'> | null = null;
  tempsChart: ChartConfiguration<'line'> | null = null;
  electricalChart: ChartConfiguration<'line'> | null = null;
  deltaChart: ChartConfiguration<'line'> | null = null;
  powerChart: ChartConfiguration<'line'> | null = null;
  efficiencyChart: ChartConfiguration<'line'> | null = null;
  consumptionChart: ChartConfiguration<'line'> | null = null;
  consumptionChartTitle = 'Análisis de consumo (kWh)';
  kwhPrice: number | null = null;
  readonly chartsPerRowOptions: ChartsPerRow[] = [1, 2, 3, 4];
  chartsPerRow: ChartsPerRow = 2;
  private savedChartsPerRow: ChartsPerRow | null = null;
  private pollingSubscription: Subscription | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly monitoringService: MonitoringService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('deviceId') ?? '';
    this.loadChartsPerRowPreference();
    this.loadLiveMeasurement();
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

  loadLiveMeasurement(): void {
    this.loading = true;
    this.error = '';
    this.monitoringService.live(this.deviceId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.noLiveMeasurement = !detail;
        if (detail) {
          this.kwhPrice = detail.installation?.valor_kwh ?? null;
          this.buildCharts(detail);
        } else {
          this.kwhPrice = null;
          this.clearCharts();
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'No fue posible cargar la medición en vivo';
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
      options: LIVE_LINE_OPTIONS,
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
      options: LIVE_LINE_OPTIONS,
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
        { label: 'Vatios (W)', color: '#7c3aed', value: (r) => computePower(r) },
      ],
      options: { ...LIVE_LINE_OPTIONS, yAxisTitle: 'Variables eléctricas (V, A, W)', nonNegativeYAxis: true },
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
      options: LIVE_LINE_OPTIONS,
    });
  }

  openPowerZoom(): void {
    if (!this.detail) return;
    this.openZoom({
      title: 'Vatios (W)',
      mode: 'multi',
      readings: this.detail.readings,
      series: [{ label: 'Vatios (W)', color: '#0f766e', value: (r) => computePower(r) }],
      options: LIVE_LINE_OPTIONS,
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
      options: { ...LIVE_LINE_OPTIONS, lineTension: 0.35 },
    });
  }

  openConsumptionZoom(): void {
    if (!this.detail) return;
    const firstKwh = this.firstValidKwh(this.detail.readings);
    this.openZoom({
      title: this.consumptionChartTitle,
      mode: 'multi',
      readings: this.detail.readings,
      series: [
        {
          label: 'Consumo (kWh)',
          color: '#c2410c',
          unit: 'kWh',
          value: (r) => this.consumptionValue(r.kWh, firstKwh),
        },
      ],
      options: { ...LIVE_LINE_OPTIONS, lineTension: 0.35, nonNegativeYAxis: true },
    });
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString() : '--';
  }

  formatDateOnly(value: string | null | undefined): string {
    if (!value) {
      return '--';
    }

    const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (dateOnly) {
      const [year, month, day] = dateOnly.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '--' : date.toLocaleDateString();
  }

  openActivoDialog(): void {
    if (!this.detail) return;
    const currentInstall = this.detail.installation;
    const dialogRef = this.dialog.open(MonitoringActivoDialogComponent, {
      width: '650px',
      data: {
        deviceId: this.deviceId,
        sessionId: this.detail.session_id,
        currentActivoId: this.detail.activo_id ?? undefined,
        activo: this.detail.activo,
        equipo_placa: currentInstall?.equipo_placa,
        equipo_modelo: currentInstall?.equipo_modelo,
        limite_inferior_celsius: currentInstall?.limite_inferior_celsius,
        limite_superior_celsius: currentInstall?.limite_superior_celsius,
        ubicacion: currentInstall?.ubicacion,
        observaciones: currentInstall?.observaciones,
        kwhPrice: currentInstall?.valor_kwh ?? this.kwhPrice,
      },
    });
    dialogRef.afterClosed().subscribe((result: ActivoDialogResult | undefined) => {
      if (!result) return;
      this.kwhPrice = result.kwhPrice ?? null;
      this.editingCard = 'activo';
      const detail = this.detail!;
      const observables: Array<Observable<{ success: boolean }>> = [];

      // 1. Update activo if changed
      const activoChanged = !result.createdActivo && result.activo_id && result.activo_id !== detail.activo_id;
      if (activoChanged) {
        observables.push(
          this.monitoringService.updateSessionActivo(this.deviceId, detail.session_id, result.activo_id),
        );
      }
      // 2. Update installation fields
      observables.push(
        this.monitoringService.updateSessionInstallation(this.deviceId, detail.session_id, {
          equipo_placa: result.equipo_placa ?? undefined,
          equipo_modelo: result.equipo_modelo ?? undefined,
          limite_inferior_celsius: result.limite_inferior_celsius ?? undefined,
          limite_superior_celsius: result.limite_superior_celsius ?? undefined,
          valor_kwh: result.kwhPrice ?? null,
          ubicacion: result.ubicacion ?? undefined,
          observaciones: result.observaciones ?? undefined,
        }),
      );

      forkJoin(observables).subscribe({
        next: () => {
          this.editingCard = null;
          this.loadLiveMeasurement();
          this.snackBar.open(
            'Información guardada — se verá reflejada en la próxima toma de lectura',
            'Cerrar',
            { duration: 4000 },
          );
        },
        error: () => {
          this.editingCard = null;
          this.snackBar.open('Error al guardar los cambios', 'Cerrar', { duration: 5000 });
        },
      });
    });
  }

  openClienteDialog(): void {
    if (!this.detail) return;
    const dialogRef = this.dialog.open(MonitoringClienteDialogComponent, {
      width: '600px',
      data: { currentClientId: this.detail.client?.id },
    });
    dialogRef.afterClosed().subscribe((result: ClienteDialogResult | undefined) => {
      if (!result?.cliente_id) return;
      this.editingCard = 'cliente';
      this.monitoringService
        .updateSessionCliente(this.deviceId, this.detail!.session_id, result.cliente_id)
        .subscribe({
          next: (detail) => {
            this.editingCard = null;
            this.detail = detail;
            this.kwhPrice = detail.installation?.valor_kwh ?? null;
            this.buildCharts(detail);
            this.snackBar.open('Información guardada — se verá reflejada en la próxima toma de lectura', 'Cerrar', { duration: 4000 });
          },
          error: () => {
            this.editingCard = null;
            this.snackBar.open('Error al actualizar el cliente', 'Cerrar', { duration: 5000 });
          },
        });
    });
  }

  openTecnicoDialog(): void {
    if (!this.detail) return;
    const data: TecnicoDialogData = {
      deviceId: this.deviceId,
      sessionId: this.detail.session_id,
      tecnico_nombre: this.detail.technician?.name,
      technical_id: this.detail.technician?.id,
      addres: this.detail.technician?.addres,
      position: this.detail.technician?.position,
      phone: this.detail.technician?.phone,
      email: this.detail.technician?.email,
      fecha_instalacion: (this.detail.technician?.fecha_instalacion || this.detail.installation?.fecha_instalacion)
        ? new Date(this.detail.technician?.fecha_instalacion || this.detail.installation!.fecha_instalacion!).toISOString()
        : null,
    };
    const dialogRef = this.dialog.open(MonitoringTecnicoDialogComponent, {
      width: '450px',
      data,
    });
    dialogRef.afterClosed().subscribe((result: TecnicoDialogResult | undefined) => {
      if (!result) return;
      this.editingCard = 'tecnico';
      this.monitoringService
        .updateSessionTechnician(this.deviceId, this.detail!.session_id, {
          tecnico_nombre: result.tecnico_nombre,
          technical_id: result.technical_id,
          addres: result.addres,
          position: result.position,
          phone: result.phone,
          email: result.email,
          fecha_instalacion: result.fecha_instalacion,
        })
        .subscribe({
          next: () => {
            this.editingCard = null;
            this.loadLiveMeasurement();
            this.snackBar.open('Información guardada — se verá reflejada en la próxima toma de lectura', 'Cerrar', { duration: 4000 });
          },
          error: () => {
            this.editingCard = null;
            this.snackBar.open('Error al actualizar el técnico', 'Cerrar', { duration: 5000 });
          },
        });
    });
  }

  toggleNotifications(enabled: boolean): void {
    if (!this.detail) return;
    this.togglingNotifications = true;
    this.monitoringService
      .updateSessionInstallation(this.deviceId, this.detail.session_id, {
        notifications_enabled: enabled,
      })
      .subscribe({
        next: () => {
          this.togglingNotifications = false;
          if (this.detail?.installation) {
            this.detail.installation.notifications_enabled = enabled;
          }
          this.snackBar.open(
            `Notificaciones ${enabled ? 'activadas' : 'desactivadas'}`,
            'Cerrar',
            { duration: 3000 },
          );
        },
        error: () => {
          this.togglingNotifications = false;
          this.snackBar.open('Error al actualizar notificaciones', 'Cerrar', {
            duration: 5000,
          });
        },
      });
  }

  private startPolling(): void {
    this.pollingSubscription = interval(8000).subscribe(() => {
      this.loadLiveMeasurement();
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
    this.mainChart = buildDualAxisChart(readings, {
      ...LIVE_LINE_OPTIONS,
      lowerLimit: detail.installation?.limite_inferior_celsius,
      upperLimit: detail.installation?.limite_superior_celsius,
    });
    this.tempsChart = buildMultiSeriesChart(readings, [
      { label: 'Gabinete', color: '#0057b8', value: (r) => r.T1 },
      { label: 'Evaporador', color: '#16a34a', value: (r) => r.T2 },
      { label: 'Ambiente', color: '#f59e0b', value: (r) => r.T3 },
      { label: 'Condensador', color: '#dc2626', value: (r) => r.T4 },
    ], LIVE_LINE_OPTIONS);
    this.electricalChart = buildMultiSeriesChart(readings, [
      { label: 'V', color: '#2563eb', value: (r) => r.V },
      { label: 'A', color: '#ff8f00', value: (r) => r.A },
      { label: 'Vatios (W)', color: '#7c3aed', value: (r) => computePower(r) },
    ], { ...LIVE_LINE_OPTIONS, yAxisTitle: 'Variables eléctricas (V, A, W)', nonNegativeYAxis: true });
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
    ], LIVE_LINE_OPTIONS);
    this.powerChart = buildMultiSeriesChart(readings, [
      { label: 'Vatios (W)', color: '#0f766e', value: (r) => computePower(r) },
    ], LIVE_LINE_OPTIONS);
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
    ], { ...LIVE_LINE_OPTIONS, lineTension: 0.35 });
    const firstKwh = this.firstValidKwh(readings);
    this.consumptionChartTitle = 'Análisis de consumo (kWh)';
    this.consumptionChart = buildMultiSeriesChart(readings, [
      {
        label: 'Consumo (kWh)',
        color: '#c2410c',
        unit: 'kWh',
        value: (r) => this.consumptionValue(r.kWh, firstKwh),
      },
    ], { ...LIVE_LINE_OPTIONS, lineTension: 0.35, nonNegativeYAxis: true });
  }

  get temperatureAlert(): { status: 'ok' | 'low' | 'high' | 'none'; message: string } | null {
    const detail = this.detail;
    if (!detail?.readings?.length) return null;
    const lastTemp = detail.readings[detail.readings.length - 1]?.T1;
    if (lastTemp == null) return null;
    const lower = detail.installation?.limite_inferior_celsius;
    const upper = detail.installation?.limite_superior_celsius;
    if (lower != null && lastTemp <= lower) {
      return { status: 'low', message: `Temperatura en límite inferior (${lastTemp.toFixed(1)} °C ≤ ${lower} °C)` };
    }
    if (upper != null && lastTemp >= upper) {
      return { status: 'high', message: `Temperatura excede límite superior (${lastTemp.toFixed(1)} °C ≥ ${upper} °C)` };
    }
    if (lower != null && upper != null) {
      return { status: 'ok', message: `Temperatura dentro del rango (${lastTemp.toFixed(1)} °C)` };
    }
    return null;
  }

  get accumulatedConsumptionKwh(): number | null {
    return this.consumptionDeltaKwh(this.detail?.readings ?? []);
  }

  get accumulatedConsumptionCost(): number | null {
    const consumption = this.accumulatedConsumptionKwh;
    return consumption != null && this.kwhPrice != null ? consumption * this.kwhPrice : null;
  }

  get setPointDuration(): string {
    const detail = this.detail;
    const lower = detail?.installation?.limite_inferior_celsius;
    if (lower == null || !detail?.readings?.length) return '—';

    const reachedReading = detail.readings.find((reading) => {
      return typeof reading.T1 === 'number' && Number.isFinite(reading.T1) && reading.T1 <= lower;
    });
    if (!reachedReading) return '—';

    const reachedMs = this.parseTimestamp(reachedReading.timestamp);
    if (reachedMs == null) return '—';

    const startMs = this.firstValidReadingTimestamp(detail.readings, reachedMs);
    if (startMs == null) return '—';

    return this.formatCompactMinutes(Math.round((reachedMs - startMs) / 60000));
  }

  private consumptionDeltaKwh(readings: MeasurementSessionDetail['readings']): number | null {
    const values = readings
      .map((reading) => reading.kWh)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (values.length < 2) return null;
    return values[values.length - 1] - values[0];
  }

  private firstValidKwh(readings: MeasurementSessionDetail['readings']): number | null {
    const first = readings.find((reading) => typeof reading.kWh === 'number' && Number.isFinite(reading.kWh));
    return first?.kWh ?? null;
  }

  private firstValidReadingTimestamp(
    readings: MeasurementSessionDetail['readings'],
    maxTimestampMs: number,
  ): number | null {
    for (const reading of readings) {
      const timestampMs = this.parseTimestamp(reading.timestamp);
      if (timestampMs != null && timestampMs <= maxTimestampMs) {
        return timestampMs;
      }
    }
    return null;
  }

  private parseTimestamp(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  private formatCompactMinutes(totalMinutes: number): string {
    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '—';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`;
    if (hours > 0) return `${hours} h`;
    return `${minutes} min`;
  }

  private consumptionValue(currentKwh: number | undefined, firstKwh: number | null): number | undefined {
    if (currentKwh == null || firstKwh == null) return undefined;
    return currentKwh - firstKwh;
  }

  clearCharts(): void {
    this.mainChart = null;
    this.tempsChart = null;
    this.electricalChart = null;
    this.deltaChart = null;
    this.powerChart = null;
    this.efficiencyChart = null;
    this.consumptionChart = null;
    this.consumptionChartTitle = 'Análisis de consumo (kWh)';
  }
}
