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
} from '../monitoring-chart.util';
import {
  MeasurementSessionDetail,
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
          this.buildCharts(detail);
        } else {
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

  openActivoDialog(): void {
    if (!this.detail) return;
    const currentInstall = this.detail.installation;
    const dialogRef = this.dialog.open(MonitoringActivoDialogComponent, {
      width: '650px',
      data: {
        currentActivoId: this.detail.activo_id ?? undefined,
        equipo_placa: currentInstall?.equipo_placa,
        equipo_modelo: currentInstall?.equipo_modelo,
        limite_inferior_celsius: currentInstall?.limite_inferior_celsius,
        limite_superior_celsius: currentInstall?.limite_superior_celsius,
        ubicacion: currentInstall?.ubicacion,
        observaciones: currentInstall?.observaciones,
      },
    });
    dialogRef.afterClosed().subscribe((result: ActivoDialogResult | undefined) => {
      if (!result) return;
      this.editingCard = 'activo';
      const detail = this.detail!;
      const observables: Array<Observable<{ success: boolean }>> = [];

      // 1. Update activo if changed
      const activoChanged = result.activo_id && result.activo_id !== detail.activo_id;
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
          next: () => {
            this.editingCard = null;
            this.loadLiveMeasurement();
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
      lowerLimit: detail.installation?.limite_inferior_celsius,
      upperLimit: detail.installation?.limite_superior_celsius,
    });
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
    const firstKwh = readings[0]?.kWh;
    this.consumptionChart = buildMultiSeriesChart(readings, [
      {
        label: 'Consumo (kWh)',
        color: '#c2410c',
        value: (r) => (r.kWh != null && firstKwh != null ? r.kWh - firstKwh : undefined),
      },
    ]);
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

  clearCharts(): void {
    this.mainChart = null;
    this.tempsChart = null;
    this.electricalChart = null;
    this.deltaChart = null;
    this.powerChart = null;
    this.efficiencyChart = null;
    this.consumptionChart = null;
  }
}
