import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChartConfiguration } from 'chart.js';
import { MonitoringReading } from './monitoring.models';
import {
  buildDualAxisChart,
  buildMultiSeriesChart,
  ChartSeriesConfig,
} from './monitoring-chart.util';

export type ZoomChartDialogData = {
  title: string;
  mode: 'dual' | 'multi';
  readings: MonitoringReading[];
  series?: ChartSeriesConfig[];
};

@Component({
  selector: 'app-monitoring-zoom-chart-dialog',
  templateUrl: './monitoring-zoom-chart-dialog.component.html',
  styleUrls: ['./monitoring-zoom-chart-dialog.component.scss'],
})
export class MonitoringZoomChartDialogComponent {
  filteredReadings: MonitoringReading[] = [];
  chart: ChartConfiguration<'line'>;

  constructor(
    private readonly dialogRef: MatDialogRef<MonitoringZoomChartDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ZoomChartDialogData,
  ) {
    this.filteredReadings = [...data.readings];
    this.chart = this.buildChart(this.filteredReadings);
  }

  close(): void {
    this.dialogRef.close();
  }

  applyRange(from: string, to: string): void {
    const fromMs = from ? Date.parse(from) : Number.NEGATIVE_INFINITY;
    const toMs = to ? Date.parse(to) : Number.POSITIVE_INFINITY;
    this.filteredReadings = this.data.readings.filter((reading) => {
      const value = Date.parse(reading.timestamp);
      return value >= fromMs && value <= toMs;
    });
    this.chart = this.buildChart(this.filteredReadings);
  }

  private buildChart(readings: MonitoringReading[]): ChartConfiguration<'line'> {
    const chartOptions = { detailedTimeAxis: true };
    if (this.data.mode === 'dual') {
      return buildDualAxisChart(readings, chartOptions);
    }
    return buildMultiSeriesChart(
      readings,
      this.data.series ?? [],
      chartOptions,
    );
  }
}
