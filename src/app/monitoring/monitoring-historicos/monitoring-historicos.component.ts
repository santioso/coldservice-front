import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import {
  buildDualAxisChart,
  buildMultiSeriesChart,
  computeDeltaTCond,
  computeDeltaTEvap,
  computeEfficiencyIndex,
  computePower,
} from '../monitoring-chart.util';
import {
  ActivoDialogResult,
  MonitoringActivoDialogComponent,
} from '../monitoring-activo-dialog.component';
import {
  MeasurementHistoryItem,
  MeasurementSessionDetail,
} from '../monitoring.models';
import { MonitoringAuthService } from '../monitoring-auth.service';
import { MonitoringConfirmDialogComponent } from '../monitoring-confirm-dialog.component';
import { MonitoringService } from '../monitoring.service';

type ChartsPerRow = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-monitoring-historicos',
  templateUrl: './monitoring-historicos.component.html',
  styleUrls: ['./monitoring-historicos.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-CO' }],
})
export class MonitoringHistoricosComponent implements OnInit {
  readonly pageSizeOptions = [10, 20, 50];
  readonly chartsPerRowOptions: ChartsPerRow[] = [1, 2, 3, 4];
  chartsPerRow: ChartsPerRow = 2;
  filters = this.fb.group({
    placa: [''],
    from: [''],
    to: [''],
  });
  items: MeasurementHistoryItem[] = [];
  selected: MeasurementSessionDetail | null = null;

  get temperatureAlert(): { status: 'ok' | 'low' | 'high' | 'none'; message: string } | null {
    const detail = this.selected;
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
  selectedItem: MeasurementHistoryItem | null = null;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;
  detailLoading = false;
  pdfLoadingSessionId: number | null = null;
  deletingSessionId: number | null = null;
  assigningActivoSessionId: number | null = null;
  error = '';
  detailError = '';
  filterMessage = '';
  listCollapsed = false;
  mainChart: ChartConfiguration<'line'> | null = null;
  tempsChart: ChartConfiguration<'line'> | null = null;
  electricalChart: ChartConfiguration<'line'> | null = null;
  deltaChart: ChartConfiguration<'line'> | null = null;
  powerChart: ChartConfiguration<'line'> | null = null;
  efficiencyChart: ChartConfiguration<'line'> | null = null;
  consumptionChart: ChartConfiguration<'line'> | null = null;

  constructor(
    private readonly fb: FormBuilder,
    public readonly authService: MonitoringAuthService,
    private readonly monitoringService: MonitoringService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  backToPanel(): void {
    this.router.navigate(['/monitoring/dashboard']);
  }

  applyFilters(): void {
    const placa = this.filters.value.placa?.trim() ?? '';
    if (placa && placa.length < 4) {
      this.filterMessage = 'Escribe al menos 4 caracteres para buscar por activo.';
      return;
    }
    this.filterMessage = '';
    this.page = 1;
    this.loadHistory();
  }

  clearFilters(): void {
    this.filters.reset({ placa: '', from: '', to: '' });
    this.filterMessage = '';
    this.page = 1;
    this.loadHistory();
  }

  onPageSizeChange(value: number): void {
    this.pageSize = value;
    this.page = 1;
    this.loadHistory();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadHistory();
  }

  toggleList(): void {
    this.listCollapsed = !this.listCollapsed;
  }

  onChartsPerRowChange(value: ChartsPerRow | string | null): void {
    const parsed = Number(value);
    if (![1, 2, 3, 4].includes(parsed)) return;
    this.chartsPerRow = parsed as ChartsPerRow;
  }

  selectItem(item: MeasurementHistoryItem): void {
    this.selectedItem = item;
    this.detailLoading = true;
    this.detailError = '';
    this.monitoringService.session(item.device_id, item.session_id).subscribe({
      next: (detail) => {
        if (!this.isSelectedItem(item)) return;
        this.selected = detail;
        this.buildCharts(detail);
        this.detailError = '';
        this.detailLoading = false;
      },
      error: () => {
        if (!this.isSelectedItem(item)) return;
        this.detailError = 'No fue posible cargar la medición seleccionada';
        this.detailLoading = false;
      },
    });
  }

  deleteItem(event: Event, item: MeasurementHistoryItem): void {
    event.stopPropagation();
    const placa = item.placa || item.activo_id || 'sin activo';
    const dialogRef = this.dialog.open(MonitoringConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar medición',
        message: `¿Está seguro de eliminar la medición del activo <strong>${placa}</strong> del <strong>${this.formatDate(item.started_at)}</strong>? Esta acción no se puede deshacer.`,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.deletingSessionId = item.session_id;
      this.monitoringService.deleteSession(item.device_id, item.session_id).subscribe({
        next: () => {
          const deletedSelected = this.selectedItem?.session_id === item.session_id;
          const nextTotal = Math.max(0, this.total - 1);
          const nextTotalPages = Math.max(1, Math.ceil(nextTotal / this.pageSize));
          this.items = this.items.filter(
            (current) => current.session_id !== item.session_id,
          );
          this.total = nextTotal;
          if (this.page > nextTotalPages) {
            this.page = nextTotalPages;
          }
          this.deletingSessionId = null;
          if (deletedSelected) {
            this.selected = null;
            this.selectedItem = null;
            this.detailError = '';
            this.clearCharts();
          }
          this.loadHistory();
        },
        error: () => {
          this.error = 'No fue posible eliminar la medición';
          this.deletingSessionId = null;
        },
      });
    });
  }

  openAssignActivoDialog(event: Event, current: MeasurementSessionDetail): void {
    event.stopPropagation();
    if (current.activo_id || this.assigningActivoSessionId) return;

    const currentInstall = current.installation;
    const dialogRef = this.dialog.open(MonitoringActivoDialogComponent, {
      width: '650px',
      data: {
        equipo_placa: currentInstall?.equipo_placa,
        equipo_modelo: currentInstall?.equipo_modelo,
        limite_inferior_celsius: currentInstall?.limite_inferior_celsius,
        limite_superior_celsius: currentInstall?.limite_superior_celsius,
        ubicacion: currentInstall?.ubicacion,
        observaciones: currentInstall?.observaciones,
      },
    });

    dialogRef.afterClosed().subscribe((result: ActivoDialogResult | undefined) => {
      if (!result?.activo_id) return;
      this.assigningActivoSessionId = current.session_id;
      this.monitoringService
        .assignSessionActivo(current.device_id, current.session_id, {
          activo_id: result.activo_id,
          limite_inferior_celsius: result.limite_inferior_celsius,
          limite_superior_celsius: result.limite_superior_celsius,
          ubicacion: result.ubicacion,
          observaciones: result.observaciones,
        })
        .subscribe({
          next: (detail) => {
            this.selected = detail;
            this.selectedItem = this.selectedItem
              ? { ...this.selectedItem, activo_id: detail.activo_id, placa: detail.activo_id }
              : this.selectedItem;
            this.items = this.items.map((item) =>
              item.session_id === detail.session_id
                ? { ...item, activo_id: detail.activo_id, placa: detail.activo_id }
                : item,
            );
            this.buildCharts(detail);
            this.assigningActivoSessionId = null;
            this.snackBar.open('Activo asignado correctamente', 'Cerrar', { duration: 4000 });
          },
          error: () => {
            this.assigningActivoSessionId = null;
            this.snackBar.open('No fue posible asignar el activo', 'Cerrar', { duration: 5000 });
          },
        });
    });
  }

  downloadPdf(event: Event, item: MeasurementHistoryItem): void {
    event.stopPropagation();
    if (!this.isPdfEnabled(item)) return;

    this.pdfLoadingSessionId = item.session_id;
    this.monitoringService.downloadSessionPdf(item.device_id, item.session_id, this.chartsPerRow).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.error = 'No fue posible descargar el PDF';
          this.pdfLoadingSessionId = null;
          return;
        }
        const filename = this.extractFilename(
          response.headers.get('Content-Disposition'),
        );
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `reporte-${item.placa || item.activo_id || item.session_id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.pdfLoadingSessionId = null;
      },
      error: () => {
        this.error = 'No fue posible descargar el PDF';
        this.pdfLoadingSessionId = null;
      },
    });
  }

  isPdfEnabled(item: MeasurementHistoryItem): boolean {
    return this.selectedItem?.session_id === item.session_id;
  }

  displayActivo(item: MeasurementHistoryItem): string {
    return item.activo_id || 'Sin activo';
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString() : '--';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  private loadHistory(): void {
    this.loading = true;
    this.error = '';
    const raw = this.filters.value;
    this.monitoringService
      .history({
        placa: raw.placa ?? '',
        from: this.toDateBoundary(raw.from, false),
        to: this.toDateBoundary(raw.to, true),
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.items = response.items;
          this.total = response.total;
          this.page = response.page;
          this.pageSize = response.page_size;
          this.loading = false;
          if (this.items.length) {
            const stillSelected = this.items.find(
              (item) => item.session_id === this.selectedItem?.session_id,
            );
            this.selectItem(stillSelected ?? this.items[0]);
          } else {
            this.selected = null;
            this.selectedItem = null;
            this.detailError = '';
            this.clearCharts();
          }
        },
        error: () => {
          this.error = 'No fue posible cargar históricos';
          this.loading = false;
        },
      });
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
      { label: 'Delta T evaporación', color: '#4f46e5', value: (r) => computeDeltaTEvap(r) },
      { label: 'Delta T condensación', color: '#ea580c', value: (r) => computeDeltaTCond(r) },
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

  private clearCharts(): void {
    this.mainChart = null;
    this.tempsChart = null;
    this.electricalChart = null;
    this.deltaChart = null;
    this.powerChart = null;
    this.efficiencyChart = null;
    this.consumptionChart = null;
  }

  private isSelectedItem(item: MeasurementHistoryItem): boolean {
    return (
      this.selectedItem?.device_id === item.device_id &&
      this.selectedItem?.session_id === item.session_id
    );
  }

  private toDateBoundary(value: string | Date | null | undefined, endOfDay: boolean): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}
