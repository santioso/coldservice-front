import { MatDialogRef } from '@angular/material/dialog';
import { MonitoringReading } from './monitoring.models';
import {
  MonitoringZoomChartDialogComponent,
  ZoomChartDialogData,
} from './monitoring-zoom-chart-dialog.component';

function localDateOnly(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function readingAt(hour: number, minute: number, T1: number, kWh: number): MonitoringReading {
  const timestamp = new Date(2026, 9, 3, hour, minute, 0, 0).toISOString();
  return { timestamp, T1, kWh };
}

function createDialog(data: ZoomChartDialogData): MonitoringZoomChartDialogComponent {
  return new MonitoringZoomChartDialogComponent(
    { close: jasmine.createSpy('close') } as unknown as MatDialogRef<MonitoringZoomChartDialogComponent>,
    data,
  );
}

describe('MonitoringZoomChartDialogComponent range controls', () => {
  it('converts local date and time selectors into the requested reading range', () => {
    const readings = [
      readingAt(10, 0, 10, 1),
      readingAt(10, 15, 8, 2),
      readingAt(10, 30, 6, 3),
    ];
    const component = createDialog({
      title: 'Temperaturas',
      mode: 'multi',
      readings,
      series: [{ label: 'Gabinete', color: '#0057b8', value: (reading) => reading.T1 }],
    });
    component.fromDate = localDateOnly(new Date(2026, 9, 3));
    component.toDate = localDateOnly(new Date(2026, 9, 3));
    component.fromHour = 10;
    component.fromMinute = 15;
    component.toHour = 10;
    component.toMinute = 30;

    component.applyRange();

    expect(component.rangeError).toBe('');
    expect(component.filteredReadings).toEqual(readings.slice(1));
    expect((component.chart.data.labels ?? []).length).toBe(2);
  });

  it('reports an explicit error for an inverted range without changing the chart', () => {
    const readings = [readingAt(10, 0, 10, 1), readingAt(10, 30, 6, 3)];
    const component = createDialog({
      title: 'Temperaturas',
      mode: 'multi',
      readings,
      series: [{ label: 'Gabinete', color: '#0057b8', value: (reading) => reading.T1 }],
    });
    const initialChart = component.chart;
    component.fromDate = localDateOnly(new Date(2026, 9, 3));
    component.toDate = localDateOnly(new Date(2026, 9, 3));
    component.fromHour = 11;
    component.fromMinute = 0;
    component.toHour = 10;
    component.toMinute = 0;

    component.applyRange();

    expect(component.rangeError).toBe('El inicio del rango debe ser anterior o igual al final.');
    expect(component.chart).toBe(initialChart);
  });
});

describe('MonitoringZoomChartDialogComponent efficiency chart', () => {
  it('plots only the final 15 minutes while using the selected range as lookup context', () => {
    const readings = [
      readingAt(10, 0, 10, 1),
      readingAt(10, 10, 8, 2),
      readingAt(10, 20, 6, 3),
      readingAt(10, 30, 4, 4),
    ];
    const component = createDialog({
       title: 'Mostrando el índice de eficiencia de los últimos 15 minutos de las lecturas en pantalla',
      mode: 'multi',
      readings,
      isEfficiency: true,
       series: [{ label: 'Mostrando el índice de eficiencia de los últimos 15 minutos de las lecturas en pantalla (ΔT/kWh)', color: '#0d9488', value: () => 0 }],
    });

    expect(component.filteredReadings).toEqual(readings.slice(2));
    expect((component.chart.data.labels ?? []).length).toBe(2);

    component.fromDate = localDateOnly(new Date(2026, 9, 3));
    component.toDate = localDateOnly(new Date(2026, 9, 3));
    component.fromHour = 10;
    component.fromMinute = 0;
    component.toHour = 10;
    component.toMinute = 30;
    component.applyRange();

    expect(component.filteredReadings).toEqual(readings.slice(2));
    expect((component.chart.data.datasets[0].data as number[])).toEqual([2, 2]);
  });

  it('keeps all selected readings for a non-efficiency chart', () => {
    const readings = [
      readingAt(10, 0, 10, 1),
      readingAt(10, 10, 8, 2),
      readingAt(10, 20, 6, 3),
      readingAt(10, 30, 4, 4),
    ];
    const component = createDialog({
      title: 'Consumo',
      mode: 'multi',
      readings,
      series: [{ label: 'Consumo (kWh)', color: '#c2410c', value: (reading) => reading.kWh }],
    });
    component.applyRange();

    expect(component.filteredReadings).toEqual(readings);
    expect((component.chart.data.labels ?? []).length).toBe(4);
  });
});
