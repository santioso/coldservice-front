import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChartConfiguration } from 'chart.js';
import { MonitoringReading } from './monitoring.models';
import {
  buildDualAxisChart,
  buildMultiSeriesChart,
  ChartSeriesConfig,
  computeEfficiencyIndex,
  MonitoringChartOptions,
  selectLatestReadings,
} from './monitoring-chart.util';

export type ZoomChartDialogData = {
  title: string;
  mode: 'dual' | 'multi';
  readings: MonitoringReading[];
  series?: ChartSeriesConfig[];
  options?: MonitoringChartOptions;
  isEfficiency?: boolean;
};

@Component({
  selector: 'app-monitoring-zoom-chart-dialog',
  templateUrl: './monitoring-zoom-chart-dialog.component.html',
  styleUrls: ['./monitoring-zoom-chart-dialog.component.scss'],
})
export class MonitoringZoomChartDialogComponent {
  readonly hourOptions = Array.from({ length: 24 }, (_, index) => index);
  readonly minuteOptions = Array.from({ length: 60 }, (_, index) => index);
  fromDate: Date | null = null;
  toDate: Date | null = null;
  fromHour = 0;
  fromMinute = 0;
  toHour = 0;
  toMinute = 0;
  rangeError = '';
  filteredReadings: MonitoringReading[] = [];
  chart: ChartConfiguration<'line'>;

  constructor(
    private readonly dialogRef: MatDialogRef<MonitoringZoomChartDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ZoomChartDialogData,
  ) {
    this.initializeRange(data.readings);
    this.filteredReadings = this.getPlottedReadings(data.readings);
    this.chart = this.buildChart(this.filteredReadings, data.readings);
  }

  close(): void {
    this.dialogRef.close();
  }

  applyRange(): void {
    const fromDateTime = this.toLocalDateTime(this.fromDate, this.fromHour, this.fromMinute);
    const toDateTime = this.toLocalDateTime(this.toDate, this.toHour, this.toMinute);
    if (!fromDateTime || !toDateTime) {
      this.rangeError = 'Selecciona la fecha y hora inicial y final.';
      return;
    }

    const fromIso = fromDateTime.toISOString();
    const toIso = toDateTime.toISOString();
    const fromMs = Date.parse(fromIso);
    const toMs = Date.parse(toIso);
    if (fromMs > toMs) {
      this.rangeError = 'El inicio del rango debe ser anterior o igual al final.';
      return;
    }

    this.rangeError = '';
    const selectedReadings = this.data.readings.filter((reading) => {
      const value = Date.parse(reading.timestamp);
      return value >= fromMs && value <= toMs;
    });
    this.filteredReadings = this.getPlottedReadings(selectedReadings);
    this.chart = this.buildChart(this.filteredReadings, selectedReadings);
  }

  private buildChart(
    readings: MonitoringReading[],
    lookupReadings: MonitoringReading[],
  ): ChartConfiguration<'line'> {
    const chartOptions = { ...(this.data.options ?? {}), detailedTimeAxis: true };
    if (this.data.mode === 'dual') {
      return buildDualAxisChart(readings, chartOptions);
    }

    const efficiencyValues = this.data.isEfficiency
      ? computeEfficiencyIndex(lookupReadings, readings)
      : [];
    const series = this.data.isEfficiency
      ? (this.data.series ?? []).map((item) => ({
          ...item,
          value: (_reading: MonitoringReading, index: number) => efficiencyValues[index],
        }))
      : this.data.series ?? [];
    return buildMultiSeriesChart(
      readings,
      series,
      chartOptions,
    );
  }

  private initializeRange(readings: MonitoringReading[]): void {
    const timestampedReadings = readings
      .map((reading) => new Date(reading.timestamp))
      .filter((timestamp) => Number.isFinite(timestamp.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const first = timestampedReadings[0];
    const last = timestampedReadings[timestampedReadings.length - 1];
    if (!first || !last) return;

    this.fromDate = this.dateOnly(first);
    this.toDate = this.dateOnly(last);
    this.fromHour = first.getHours();
    this.fromMinute = first.getMinutes();
    this.toHour = last.getHours();
    this.toMinute = last.getMinutes();
  }

  private getPlottedReadings(readings: MonitoringReading[]): MonitoringReading[] {
    return this.data.isEfficiency ? selectLatestReadings(readings) : [...readings];
  }

  private dateOnly(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private toLocalDateTime(date: Date | null, hour: number, minute: number): Date | null {
    if (!date || Number.isNaN(date.getTime())) return null;
    const localDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
      0,
      0,
    );
    return Number.isNaN(localDateTime.getTime()) ? null : localDateTime;
  }
}
