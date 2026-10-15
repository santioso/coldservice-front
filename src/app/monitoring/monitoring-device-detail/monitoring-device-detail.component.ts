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
  MonitoringWhatsappRecipientsDialogComponent,
  MonitoringWhatsappRecipientsDialogResult,
  WhatsappRecipientsDialogData,
} from '../monitoring-whatsapp-recipients-dialog.component';
import {
  buildDualAxisChart,
  buildMultiSeriesChart,
  computeDeltaTCond,
  computeDeltaTEvap,
  computeEfficiencyIndex,
  computePower,
  MonitoringChartOptions,
  selectLatestReadings,
} from '../monitoring-chart.util';
import {
  MeasurementSessionDetail,
  getWhatsappRecipient,
  MonitoringAlarmConfiguration,
  MonitoringNotificationRecipientsResponse,
  MonitoringReading,
} from '../monitoring.models';
import { MonitoringService } from '../monitoring.service';

type ChartsPerRow = 1 | 2 | 3 | 4;
type ChartRangeHours = 2 | 6 | 8 | 12 | 24;
const CHARTS_PER_ROW_STORAGE_KEY = 'monitoring-device-charts-per-row';
const LARGE_SCREEN_MIN_WIDTH = 960;
const HOUR_MS = 60 * 60 * 1000;
const CHART_RANGE_OPTIONS: readonly ChartRangeHours[] = [2, 6, 8, 12, 24];
const EFFICIENCY_CHART_TITLE =
  'Mostrando el índice de eficiencia de los últimos 15 minutos de las lecturas en pantalla';
const EFFICIENCY_CHART_LABEL = `${EFFICIENCY_CHART_TITLE} (ΔT/kWh)`;
const LIVE_LINE_OPTIONS: MonitoringChartOptions = {
  pointRadius: 0,
  updateAnimationDuration: 400,
};

@Component({
  selector: 'app-monitoring-device-detail',
  templateUrl: './monitoring-device-detail.component.html',
  styleUrls: ['./monitoring-device-detail.component.scss'],
})
export class MonitoringDeviceDetailComponent implements OnInit, OnDestroy {
  deviceId = '';
  detail: MeasurementSessionDetail | null = null;
  displayedReadings: MonitoringReading[] = [];
  displayedRangeFrom: Date | null = null;
  displayedRangeTo: Date | null = null;
  noLiveMeasurement = false;
  loading = false;
  refreshing = false;
  displayedRangeLoading = false;
  error = '';
  editingCard: 'cliente' | 'activo' | 'tecnico' | null = null;
  whatsappLoading = false;
  whatsappError = '';
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
  readonly chartRangeOptions = CHART_RANGE_OPTIONS;
  selectedChartRangeHours: ChartRangeHours = 8;
  chartsPerRow: ChartsPerRow = 2;
  private savedChartsPerRow: ChartsPerRow | null = null;
  private pollingSubscription: Subscription | null = null;
  private routeSubscription: Subscription | null = null;
  private liveMeasurementSubscription: Subscription | null = null;
  private displayedReadingsSubscription: Subscription | null = null;
  private liveMeasurementRequestSequence = 0;
  private displayedReadingsRequestSequence = 0;
  private clientSnapshotUpdateInProgress = false;
  private clientSnapshotUpdateSequence = 0;
  private lastAppliedLatestReadingTimestamp: string | null | undefined;
  private chartRenderSignature: string | null = null;
  private historicalChartRange = false;
  notificationRecipients: MonitoringNotificationRecipientsResponse | null = null;
  alarmConfiguration: MonitoringAlarmConfiguration | null = null;
  alarmConfigurationLoading = false;
  alarmConfigurationError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly monitoringService: MonitoringService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadChartsPerRowPreference();
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const deviceId = params.get('deviceId') ?? '';
      if (!deviceId || deviceId === this.deviceId) {
        return;
      }
      this.clientSnapshotUpdateSequence += 1;
      this.clientSnapshotUpdateInProgress = false;
      if (this.editingCard === 'cliente') {
        this.editingCard = null;
      }
      this.cancelLiveMeasurement();
      this.cancelDisplayedReadingsRequest();
      this.lastAppliedLatestReadingTimestamp = undefined;
      this.chartRenderSignature = null;
      this.historicalChartRange = false;
      this.displayedReadings = [];
      this.displayedRangeFrom = null;
      this.displayedRangeTo = null;
      this.deviceId = deviceId;
      this.detail = null;
      this.loadLiveMeasurement();
      this.loadWhatsappRecipients();
      this.loadAlarmConfiguration();
    });
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

  onChartRangeChange(value: ChartRangeHours | string | null): void {
    if (this.displayedRangeLoading) {
      return;
    }

    const parsed = Number(value);
    if (!CHART_RANGE_OPTIONS.includes(parsed as ChartRangeHours)) {
      return;
    }

    const selectedHours = parsed as ChartRangeHours;
    if (this.isChartRangeOptionDisabled(selectedHours)) {
      return;
    }

    if (selectedHours === this.selectedChartRangeHours) {
      return;
    }

    this.selectedChartRangeHours = selectedHours;
    if (!this.detail) {
      return;
    }

    if (this.historicalChartRange && this.displayedRangeTo) {
      const to = new Date(this.displayedRangeTo.getTime());
      const from = new Date(to.getTime() - this.chartWindowMs);
      this.loadChartReadings(from, to);
      return;
    }

    this.historicalChartRange = false;
    this.applyLatestDisplayedReadings(this.detail, false);
  }

  ngOnDestroy(): void {
    this.clientSnapshotUpdateSequence += 1;
    this.cancelLiveMeasurement();
    this.cancelDisplayedReadingsRequest();
    this.pollingSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
    this.refreshing = false;
  }

  backToPanel(): void {
    this.router.navigate(['/monitoring/dashboard']);
  }

  loadLiveMeasurement(): void {
    const hasRenderedDetail = this.detail !== null;
    this.cancelLiveMeasurement();
    const requestSequence = this.liveMeasurementRequestSequence;
    const requestedDeviceId = this.deviceId;
    this.loading = true;
    this.refreshing = hasRenderedDetail;
    this.error = '';
    this.liveMeasurementSubscription = this.monitoringService.live(this.deviceId).subscribe({
      next: (detail) => {
        if (requestSequence !== this.liveMeasurementRequestSequence || requestedDeviceId !== this.deviceId) {
          return;
        }
        if (detail === null && hasRenderedDetail) {
          this.loading = false;
          this.refreshing = false;
          return;
        }
        this.applyLiveMeasurementDetail(detail);
      },
      error: () => {
        if (requestSequence !== this.liveMeasurementRequestSequence || requestedDeviceId !== this.deviceId) {
          return;
        }
        this.error = 'No fue posible cargar la medición en vivo';
        this.loading = false;
        this.refreshing = false;
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
    if (!this.detail || !this.displayedReadings.length) return;
    this.openZoom({
      title: 'Corriente vs temp. gabinete',
      mode: 'dual',
      readings: this.displayedReadings,
      options: LIVE_LINE_OPTIONS,
    });
  }

  openTempsZoom(): void {
    if (!this.detail || !this.displayedReadings.length) return;
    this.openZoom({
      title: 'Temperaturas',
      mode: 'multi',
      readings: this.displayedReadings,
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
    if (!this.detail || !this.displayedReadings.length) return;
    this.openZoom({
      title: 'Variables eléctricas',
      mode: 'multi',
      readings: this.displayedReadings,
      series: [
        { label: 'V', color: '#2563eb', value: (r) => r.V },
        { label: 'A', color: '#ff8f00', value: (r) => r.A },
        { label: 'Vatios (W)', color: '#7c3aed', value: (r) => computePower(r) },
      ],
      options: { ...LIVE_LINE_OPTIONS, yAxisTitle: 'Variables eléctricas (V, A, W)', nonNegativeYAxis: true },
    });
  }

  openDeltaZoom(): void {
    if (!this.detail || !this.displayedReadings.length) return;
    this.openZoom({
      title: 'Eficiencia de intercambio',
      mode: 'multi',
      readings: this.displayedReadings,
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
    if (!this.detail || !this.displayedReadings.length) return;
    this.openZoom({
      title: 'Vatios (W)',
      mode: 'multi',
      readings: this.displayedReadings,
      series: [{ label: 'Vatios (W)', color: '#0f766e', value: (r) => computePower(r) }],
      options: LIVE_LINE_OPTIONS,
    });
  }

  openEfficiencyZoom(): void {
    if (!this.detail || !this.displayedReadings.length) return;
    this.openZoom({
      title: EFFICIENCY_CHART_TITLE,
      mode: 'multi',
      readings: this.displayedReadings,
      isEfficiency: true,
      series: [
        {
          label: EFFICIENCY_CHART_LABEL,
          color: '#0d9488',
          value: () => 0,
        },
      ],
      options: { ...LIVE_LINE_OPTIONS, lineTension: 0.35 },
    });
  }

  openConsumptionZoom(): void {
    if (!this.detail || !this.displayedReadings.length) return;
    this.openZoom({
      title: this.consumptionChartTitle,
      mode: 'multi',
      readings: this.displayedReadings,
      series: [
        {
          label: 'Consumo (kWh)',
          color: '#c2410c',
          unit: 'kWh',
          value: (r) => r.kWh,
        },
      ],
      options: { ...LIVE_LINE_OPTIONS, lineTension: 0.35, nonNegativeYAxis: true },
    });
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString() : '--';
  }

  get latestMeasurementAt(): string | null {
    if (!this.detail) {
      return null;
    }
    return this.detail.last_reading_at ||
      this.detail.readings[this.detail.readings.length - 1]?.timestamp ||
      null;
  }

  get firstMeasurementAt(): string | null {
    if (!this.detail) {
      return null;
    }

    const backendTimestamp = this.validTimestamp(this.detail.first_reading_at);
    if (backendTimestamp) {
      return backendTimestamp;
    }

    const earliestVisibleReading = [...this.detail.readings]
      .filter((reading) => this.validTimestamp(reading.timestamp))
      .sort(
        (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
      )[0];
    if (earliestVisibleReading) {
      return earliestVisibleReading.timestamp;
    }
    return this.detail.readings.length === 0 ? this.detail.started_at || null : null;
  }

  get readingsReceivedCount(): number {
    return this.detail?.readings_received_count ?? this.detail?.readings_count ?? 0;
  }

  get displayedRangeLabel(): string {
    if (!this.displayedRangeFrom || !this.displayedRangeTo) {
      return '--';
    }
    return `${this.formatDate(this.displayedRangeFrom.toISOString())} — ${this.formatDate(this.displayedRangeTo.toISOString())}`;
  }

  get isHistoricalChartRange(): boolean {
    return this.historicalChartRange;
  }

  get chartWindowMs(): number {
    return this.selectedChartRangeHours * HOUR_MS;
  }

  isChartRangeOptionDisabled(hours: ChartRangeHours): boolean {
    if (hours <= 8) {
      return false;
    }

    const availableSpan = this.availableReadingSpanMs();
    return availableSpan == null || availableSpan.last - availableSpan.first < hours * HOUR_MS;
  }

  get nextChartRangeDisabled(): boolean {
    if (this.displayedRangeLoading || !this.displayedRangeTo) {
      return true;
    }
    const latestTimestamp = this.latestKnownReadingTimestampMs();
    return latestTimestamp == null || this.displayedRangeTo.getTime() + this.chartWindowMs > latestTimestamp;
  }

  get previousChartRangeDisabled(): boolean {
    if (this.displayedRangeLoading || !this.detail || !this.displayedRangeFrom) {
      return true;
    }

    const displayedFromMs = this.displayedRangeFrom.getTime();
    const earliestTimestampMs = this.earliestAuthoritativeReadingTimestampMs();
    return !Number.isFinite(displayedFromMs)
      || earliestTimestampMs == null
      || displayedFromMs <= earliestTimestampMs;
  }

  navigateToPreviousChartRange(): void {
    if (this.previousChartRangeDisabled || !this.detail || !this.displayedRangeFrom || !this.displayedRangeTo) return;
    const to = new Date(this.displayedRangeFrom.getTime());
    const from = new Date(to.getTime() - this.chartWindowMs);
    this.loadChartReadings(from, to);
  }

  navigateToNextChartRange(): void {
    if (this.nextChartRangeDisabled || !this.displayedRangeFrom || !this.displayedRangeTo) return;
    const from = new Date(this.displayedRangeTo.getTime());
    const to = new Date(from.getTime() + this.chartWindowMs);
    this.loadChartReadings(from, to);
  }

  returnToLatestChartRange(): void {
    if (!this.detail) return;
    this.cancelDisplayedReadingsRequest();
    this.historicalChartRange = false;
    this.applyLatestDisplayedReadings(this.detail, false);
  }

  private validTimestamp(value: string | null | undefined): string | null {
    return value && Number.isFinite(Date.parse(value)) ? value : null;
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
          limite_inferior_celsius: result.limite_inferior_celsius ?? null,
          limite_superior_celsius: result.limite_superior_celsius ?? null,
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
      data: { currentClient: this.detail.client, currentClientId: this.detail.client?.id },
    });
    dialogRef.afterClosed().subscribe((result: ClienteDialogResult | undefined) => {
      if (!result?.cliente_id) return;
      const requestedDeviceId = this.deviceId;
      const requestedSessionId = this.detail!.session_id;
      const snapshotUpdateSequence = ++this.clientSnapshotUpdateSequence;
      this.clientSnapshotUpdateInProgress = true;
      this.editingCard = 'cliente';
      this.cancelLiveMeasurement();
      this.error = '';
      this.monitoringService
        .updateSessionCliente(requestedDeviceId, requestedSessionId, result.cliente_id)
        .subscribe({
          next: (detail) => {
            if (snapshotUpdateSequence !== this.clientSnapshotUpdateSequence || requestedDeviceId !== this.deviceId) {
              return;
            }
            this.applyLiveMeasurementDetail(detail);
            this.clientSnapshotUpdateInProgress = false;
            this.editingCard = null;
            this.snackBar.open('Información guardada — se verá reflejada en la próxima toma de lectura', 'Cerrar', { duration: 4000 });
          },
          error: () => {
            if (snapshotUpdateSequence !== this.clientSnapshotUpdateSequence || requestedDeviceId !== this.deviceId) {
              return;
            }
            this.clientSnapshotUpdateInProgress = false;
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

  openWhatsappRecipientsDialog(): void {
    if (
      !this.notificationRecipients
      || !this.alarmConfiguration
      || this.whatsappLoading
      || this.alarmConfigurationLoading
    ) {
      return;
    }

    const data: WhatsappRecipientsDialogData = {
      configuration: this.notificationRecipients,
      alarmConfiguration: { ...this.alarmConfiguration },
      alarmConfigurationNotice: this.alarmConfigurationError || undefined,
    };
    const dialogRef = this.dialog.open(MonitoringWhatsappRecipientsDialogComponent, {
      width: '860px',
      maxWidth: '95vw',
      disableClose: true,
      data,
    });
    dialogRef.afterClosed().subscribe((result: MonitoringWhatsappRecipientsDialogResult | undefined) => {
      if (result) {
        this.applyDialogResult(result);
      }
    });
  }

  private loadWhatsappRecipients(): void {
    const requestedDeviceId = this.deviceId;
    this.whatsappLoading = true;
    this.whatsappError = '';
    this.notificationRecipients = null;
    this.monitoringService.getNotificationRecipients(this.deviceId).subscribe({
      next: (configuration) => {
        if (requestedDeviceId !== this.deviceId) {
          return;
        }
        this.applyWhatsappConfiguration(configuration);
        this.whatsappLoading = false;
      },
      error: () => {
        if (requestedDeviceId !== this.deviceId) {
          return;
        }
        this.whatsappLoading = false;
        this.whatsappError = 'No fue posible cargar los destinatarios de WhatsApp';
      },
    });
  }

  private loadAlarmConfiguration(): void {
    const requestedDeviceId = this.deviceId;
    this.alarmConfigurationLoading = true;
    this.alarmConfigurationError = '';
    this.alarmConfiguration = null;
    this.monitoringService.getAlarmConfiguration(this.deviceId).subscribe({
      next: (configuration) => {
        if (requestedDeviceId !== this.deviceId) return;
        this.alarmConfiguration = configuration;
        this.alarmConfigurationLoading = false;
      },
      error: (error) => {
        if (requestedDeviceId !== this.deviceId) return;
        this.alarmConfigurationLoading = false;
        if (error?.status === 404) {
          this.alarmConfiguration = this.defaultAlarmConfiguration();
          this.alarmConfigurationError =
            'No existe una configuración guardada; revisa los valores predeterminados y guárdalos.';
          return;
        }
        this.alarmConfigurationError = 'No fue posible cargar la configuración de alarmas';
      },
    });
  }

  private defaultAlarmConfiguration(): MonitoringAlarmConfiguration {
    return {
      device_id: this.deviceId,
      temperature_metric: 'T1',
      minimum_celsius: this.detail?.installation?.limite_inferior_celsius ?? 0,
      maximum_celsius: this.detail?.installation?.limite_superior_celsius ?? 0,
      enabled: true,
      out_of_range_duration_minutes: 10,
      in_range_resolution_duration_minutes: 5,
      stale_data_after_minutes: 5,
      repeat_interval_minutes: 30,
      repeat_count: 4,
      post_repeat_interval_minutes: 60,
    };
  }

  private applyWhatsappConfiguration(
    configuration: MonitoringNotificationRecipientsResponse,
  ): void {
    this.notificationRecipients = configuration;
  }

  private applyDialogResult(result: MonitoringWhatsappRecipientsDialogResult): void {
    if (result.notificationRecipients) {
      this.applyWhatsappConfiguration(result.notificationRecipients);
    }
    if (result.alarmConfiguration) {
      this.alarmConfiguration = result.alarmConfiguration;
      this.alarmConfigurationError = '';
    }
  }

  get whatsappRecipientsSummary(): string {
    if (this.whatsappLoading) {
      return 'Cargando destinatarios de WhatsApp...';
    }
    if (this.whatsappError) {
      return 'No fue posible cargar los destinatarios de WhatsApp.';
    }
    if (!this.notificationRecipients) {
      return 'No se reportarán alarmas por WhatsApp.';
    }

    const recipients = (['level_1', 'level_2'] as const)
      .map((level) => {
        const recipient = getWhatsappRecipient(this.notificationRecipients!, level);
        return recipient?.enabled && recipient.address.trim()
          ? `${level === 'level_1' ? 'Nivel 1' : 'Nivel 2'}: ${recipient.address.trim()}`
          : null;
      })
      .filter((recipient): recipient is string => recipient !== null);

    return recipients.length
      ? `Reportar alarmas a: ${recipients.join(' · ')}`
      : 'No se reportarán alarmas por WhatsApp.';
  }

  private startPolling(): void {
    this.pollingSubscription = interval(30000).subscribe(() => {
      if (this.clientSnapshotUpdateInProgress) {
        return;
      }
      if (this.liveMeasurementSubscription && !this.liveMeasurementSubscription.closed) {
        return;
      }
      this.loadLiveMeasurement();
    });
  }

  private cancelLiveMeasurement(): void {
    this.liveMeasurementRequestSequence += 1;
    this.liveMeasurementSubscription?.unsubscribe();
    this.liveMeasurementSubscription = null;
    this.loading = false;
    this.refreshing = false;
  }

  private cancelDisplayedReadingsRequest(): void {
    this.displayedReadingsRequestSequence += 1;
    this.displayedReadingsSubscription?.unsubscribe();
    this.displayedReadingsSubscription = null;
    this.displayedRangeLoading = false;
  }

  private applyLiveMeasurementDetail(detail: MeasurementSessionDetail | null): void {
    this.detail = detail;
    this.noLiveMeasurement = !detail;
    this.error = '';
    if (detail) {
      if (!this.historicalChartRange && this.selectedChartRangeHours > 8 &&
        this.isChartRangeOptionDisabled(this.selectedChartRangeHours)) {
        this.selectedChartRangeHours = 8;
      }

      const latestReadingTimestamp =
        detail.readings[detail.readings.length - 1]?.timestamp ?? null;
      const chartSignature = this.getChartSignature(detail, this.displayedReadings);
      const animateOnUpdate =
        this.lastAppliedLatestReadingTimestamp === undefined ||
        this.lastAppliedLatestReadingTimestamp !== latestReadingTimestamp;
      this.lastAppliedLatestReadingTimestamp = latestReadingTimestamp;
      this.kwhPrice = detail.installation?.valor_kwh ?? null;
      if (!this.historicalChartRange) {
        this.applyLatestDisplayedReadings(detail, animateOnUpdate);
      } else if (this.chartRenderSignature !== chartSignature) {
        this.chartRenderSignature = chartSignature;
        this.buildCharts(detail, this.displayedReadings, false);
      }
    } else {
      this.lastAppliedLatestReadingTimestamp = undefined;
      this.kwhPrice = null;
      this.clearCharts();
    }
    this.loading = false;
    this.refreshing = false;
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

  private buildCharts(
    detail: MeasurementSessionDetail,
    readings: MonitoringReading[],
    animateOnUpdate: boolean,
  ): void {
    const liveChartOptions: MonitoringChartOptions = {
      ...LIVE_LINE_OPTIONS,
      animateOnUpdate,
    };
    this.mainChart = buildDualAxisChart(readings, {
      ...liveChartOptions,
      lowerLimit: detail.installation?.limite_inferior_celsius,
      upperLimit: detail.installation?.limite_superior_celsius,
    });
    this.tempsChart = buildMultiSeriesChart(readings, [
      { label: 'Gabinete', color: '#0057b8', value: (r) => r.T1 },
      { label: 'Evaporador', color: '#16a34a', value: (r) => r.T2 },
      { label: 'Ambiente', color: '#f59e0b', value: (r) => r.T3 },
      { label: 'Condensador', color: '#dc2626', value: (r) => r.T4 },
    ], liveChartOptions);
    this.electricalChart = buildMultiSeriesChart(readings, [
      { label: 'V', color: '#2563eb', value: (r) => r.V },
      { label: 'A', color: '#ff8f00', value: (r) => r.A },
      { label: 'Vatios (W)', color: '#7c3aed', value: (r) => computePower(r) },
    ], { ...liveChartOptions, yAxisTitle: 'Variables eléctricas (V, A, W)', nonNegativeYAxis: true });
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
    ], liveChartOptions);
    this.powerChart = buildMultiSeriesChart(readings, [
      { label: 'Vatios (W)', color: '#0f766e', value: (r) => computePower(r) },
    ], liveChartOptions);
    const efficiencyReadings = selectLatestReadings(readings);
    const efficiencyValues = computeEfficiencyIndex(readings, efficiencyReadings);
    this.efficiencyChart = buildMultiSeriesChart(efficiencyReadings, [
      {
        label: EFFICIENCY_CHART_LABEL,
        color: '#0d9488',
        value: (_reading, index) => efficiencyValues[index],
      },
    ], { ...liveChartOptions, lineTension: 0.35 });
    this.consumptionChartTitle = 'Análisis de consumo (kWh)';
    this.consumptionChart = buildMultiSeriesChart(readings, [
      {
        label: 'Consumo (kWh)',
        color: '#c2410c',
        unit: 'kWh',
        value: (r) => r.kWh,
      },
    ], { ...liveChartOptions, lineTension: 0.35, nonNegativeYAxis: true });
  }

  private getChartSignature(
    detail: MeasurementSessionDetail,
    readings: MonitoringReading[] = this.displayedReadings,
  ): string {
    const latestReadingTimestamp =
      readings[readings.length - 1]?.timestamp ?? null;
    return JSON.stringify([
      latestReadingTimestamp,
      readings.length,
      detail.installation?.limite_inferior_celsius ?? null,
      detail.installation?.limite_superior_celsius ?? null,
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

  get accumulatedConsumptionKwh(): number | null {
    const backendConsumption = this.detail?.total_consumption_kwh;
    if (this.detail && Object.prototype.hasOwnProperty.call(this.detail, 'total_consumption_kwh')) {
      return typeof backendConsumption === 'number' && Number.isFinite(backendConsumption)
        ? backendConsumption
        : null;
    }
    if (typeof backendConsumption === 'number' && Number.isFinite(backendConsumption)) {
      return backendConsumption;
    }
    return this.consumptionDeltaKwh(this.detail?.readings ?? []);
  }

  get accumulatedConsumptionCost(): number | null {
    const consumption = this.accumulatedConsumptionKwh;
    const kwhPrice = this.kwhPrice ?? this.detail?.installation?.valor_kwh ?? null;
    return consumption != null && kwhPrice != null ? consumption * kwhPrice : null;
  }

  get setPointDuration(): string {
    const detail = this.detail;
    const backendDuration = detail?.set_point_duration_minutes;
    if (detail && Object.prototype.hasOwnProperty.call(detail, 'set_point_duration_minutes')) {
      return typeof backendDuration === 'number' && Number.isFinite(backendDuration) && backendDuration >= 0
        ? this.formatCompactMinutes(Math.round(backendDuration))
        : '—';
    }
    if (typeof backendDuration === 'number' && Number.isFinite(backendDuration) && backendDuration >= 0) {
      return this.formatCompactMinutes(Math.round(backendDuration));
    }
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

  clearCharts(): void {
    this.chartRenderSignature = null;
    this.displayedReadings = [];
    this.displayedRangeFrom = null;
    this.displayedRangeTo = null;
    this.mainChart = null;
    this.tempsChart = null;
    this.electricalChart = null;
    this.deltaChart = null;
    this.powerChart = null;
    this.efficiencyChart = null;
    this.consumptionChart = null;
    this.consumptionChartTitle = 'Análisis de consumo (kWh)';
  }

  private loadChartReadings(from: Date, to: Date): void {
    this.loadDisplayedReadings(from, to, true);
  }

  private loadDisplayedReadings(
    from: Date,
    to: Date,
    historical: boolean,
    animateOnUpdate = false,
  ): void {
    const requestSequence = ++this.displayedReadingsRequestSequence;
    this.displayedReadingsSubscription?.unsubscribe();
    this.historicalChartRange = historical;
    this.displayedRangeLoading = true;
    this.error = '';
    this.displayedReadingsSubscription = this.monitoringService.readings(this.deviceId, from, to).subscribe({
      next: (response) => {
        if (requestSequence !== this.displayedReadingsRequestSequence || !this.detail) return;
        this.displayedRangeFrom = from;
        this.displayedRangeTo = to;
        this.displayedReadings = response.readings;
        this.displayedRangeLoading = false;
        this.chartRenderSignature = this.getChartSignature(this.detail, this.displayedReadings);
        this.buildCharts(this.detail, this.displayedReadings, animateOnUpdate);
        this.displayedReadingsSubscription = null;
      },
      error: () => {
        if (requestSequence !== this.displayedReadingsRequestSequence) return;
        this.displayedRangeLoading = false;
        this.error = 'No fue posible cargar las lecturas del rango seleccionado';
        this.displayedReadingsSubscription = null;
      },
    });
  }

  private applyLatestDisplayedReadings(
    detail: MeasurementSessionDetail,
    animateOnUpdate: boolean,
  ): void {
    const latestTimestamp = this.latestKnownReadingTimestampMs(detail);
    if (latestTimestamp == null) {
      this.cancelDisplayedReadingsRequest();
      this.displayedReadings = [];
      this.displayedRangeFrom = null;
      this.displayedRangeTo = null;
      this.clearCharts();
      return;
    }

    const to = new Date(latestTimestamp);
    const from = new Date(latestTimestamp - this.chartWindowMs);
    this.displayedRangeFrom = from;
    this.displayedRangeTo = to;

    if (this.selectedChartRangeHours > 8) {
      this.loadDisplayedReadings(from, to, false, animateOnUpdate);
      return;
    }

    this.cancelDisplayedReadingsRequest();
    this.displayedReadings = this.filterReadingsToRange(detail.readings, from, to);
    const chartSignature = this.getChartSignature(detail, this.displayedReadings);
    if (this.chartRenderSignature !== chartSignature) {
      this.chartRenderSignature = chartSignature;
      this.buildCharts(detail, this.displayedReadings, animateOnUpdate);
    }
  }

  private filterReadingsToRange(
    readings: MonitoringReading[],
    from: Date,
    to: Date,
  ): MonitoringReading[] {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return readings.filter((reading) => {
      const timestamp = Date.parse(reading.timestamp);
      return Number.isFinite(timestamp) && timestamp >= fromMs && timestamp <= toMs;
    });
  }

  private latestKnownReadingTimestampMs(detail: MeasurementSessionDetail | null = this.detail): number | null {
    if (!detail) return null;
    const timestamps = [
      detail.last_reading_at,
      ...detail.readings.map((reading) => reading.timestamp),
    ]
      .map((timestamp) => timestamp ? Date.parse(timestamp) : Number.NaN)
      .filter((timestamp) => Number.isFinite(timestamp));
    return timestamps.length ? Math.max(...timestamps) : null;
  }

  private availableReadingSpanMs(
    detail: MeasurementSessionDetail | null = this.detail,
  ): { first: number; last: number } | null {
    if (!detail) return null;

    const readings = Array.isArray(detail.readings) ? detail.readings : [];
    const visibleTimestamps = readings
      .map((reading) => this.parseTimestamp(reading.timestamp))
      .filter((timestamp): timestamp is number => timestamp != null);
    const first = this.parseTimestamp(detail.first_reading_at) ??
      (visibleTimestamps.length ? Math.min(...visibleTimestamps) : null);
    const last = this.parseTimestamp(detail.last_reading_at) ??
      (visibleTimestamps.length ? Math.max(...visibleTimestamps) : null);

    if (first == null || last == null || last < first) {
      return null;
    }

    return { first, last };
  }

  private earliestAuthoritativeReadingTimestampMs(): number | null {
    if (!this.detail) return null;

    const firstReadingTimestamp = this.detail.first_reading_at;
    if (firstReadingTimestamp && Number.isFinite(Date.parse(firstReadingTimestamp))) {
      return Date.parse(firstReadingTimestamp);
    }

    const readings = Array.isArray(this.detail.readings) ? this.detail.readings : [];
    const readingTimestamps = readings
      .map((reading) => Date.parse(reading.timestamp))
      .filter((timestamp) => Number.isFinite(timestamp));
    if (readingTimestamps.length) {
      return Math.min(...readingTimestamps);
    }

    if (readings.length === 0 && this.detail.started_at) {
      const startedAt = Date.parse(this.detail.started_at);
      return Number.isFinite(startedAt) ? startedAt : null;
    }

    return null;
  }
}
