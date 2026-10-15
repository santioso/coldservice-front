import {
  buildDualAxisChart,
  buildMultiSeriesChart,
  computeEfficiencyIndex,
  selectLatestReadings,
} from './monitoring-chart.util';
import { MonitoringReading } from './monitoring.models';

describe('monitoring chart animation options', () => {
  const readings: MonitoringReading[] = [
    { timestamp: '2026-10-03T12:00:00.000Z', T1: 4.5 },
  ];

  it('preserves Chart.js defaults when animation is not requested', () => {
    const dualAxisOptions = buildDualAxisChart(readings).options as any;
    const multiSeriesOptions = buildMultiSeriesChart(readings, [
      { label: 'Gabinete', color: '#0057b8', value: (reading) => reading.T1 },
    ]).options as any;

    expect(dualAxisOptions.animation).toBeUndefined();
    expect(multiSeriesOptions.animation).toBeUndefined();
  });

  it('supports enabling and disabling the live update animation', () => {
    const animatedOptions = buildDualAxisChart(readings, {
      animateOnUpdate: true,
    }).options as any;
    const staticOptions = buildMultiSeriesChart(
      readings,
      [{ label: 'Gabinete', color: '#0057b8', value: (reading) => reading.T1 }],
      { animateOnUpdate: false },
    ).options as any;

    expect(animatedOptions.animation).toEqual({
      duration: 700,
      easing: 'easeOutCubic',
    });
    expect(staticOptions.animation).toBeFalse();
  });

  it('supports a scoped update animation duration without changing the easing', () => {
    const options = buildDualAxisChart(readings, {
      animateOnUpdate: true,
      updateAnimationDuration: 400,
    }).options as any;

    expect(options.animation).toEqual({
      duration: 400,
      easing: 'easeOutCubic',
    });
  });
});

describe('computeEfficiencyIndex', () => {
  it('selects only the latest 15 minutes without changing other chart inputs', () => {
    const readings: MonitoringReading[] = [
      { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1, A: 1 },
      { timestamp: '2026-10-03T12:10:00.000Z', T1: 9, kWh: 1.5, A: 2 },
      { timestamp: '2026-10-03T12:20:00.000Z', T1: 8, kWh: 2, A: 3 },
      { timestamp: '2026-10-03T12:30:00.000Z', T1: 7, kWh: 2.5, A: 4 },
    ];
    const efficiencyReadings = selectLatestReadings(readings);

    expect(efficiencyReadings).toEqual(readings.slice(2));
    expect(buildMultiSeriesChart(readings, [
      { label: 'Corriente', color: '#ff8f00', value: (reading) => reading.A },
    ]).data.labels).toHaveSize(4);
    expect(buildMultiSeriesChart(efficiencyReadings, [
      { label: 'IE 15 min (ΔT/kWh)', color: '#0d9488', value: () => 0 },
    ]).data.labels).toHaveSize(2);
  });

  it('uses the full readings as lookup context for the plotted 15-minute subset', () => {
    const readings: MonitoringReading[] = [
      { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1 },
      { timestamp: '2026-10-03T12:10:00.000Z', T1: 8, kWh: 2 },
      { timestamp: '2026-10-03T12:20:00.000Z', T1: 6, kWh: 3 },
    ];
    const efficiencyReadings = selectLatestReadings(readings);

    expect(efficiencyReadings.map((reading) => reading.timestamp)).toEqual([
      '2026-10-03T12:10:00.000Z',
      '2026-10-03T12:20:00.000Z',
    ]);
    expect(computeEfficiencyIndex(readings, efficiencyReadings)).toEqual([0, 2]);
  });

  it('returns zero during the first 15 minutes', () => {
    const readings: MonitoringReading[] = [
      { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1 },
      { timestamp: '2026-10-03T12:05:00.000Z', T1: 9, kWh: 1.25 },
      { timestamp: '2026-10-03T12:10:00.000Z', T1: 8, kWh: 1.5 },
    ];

    expect(computeEfficiencyIndex(readings)).toEqual([0, 0, 0]);
  });

  it('uses the exact 15-minute-old reading in the formula', () => {
    const readings: MonitoringReading[] = [
      { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1 },
      { timestamp: '2026-10-03T12:15:00.000Z', T1: 7, kWh: 2.5 },
    ];

    expect(computeEfficiencyIndex(readings)).toEqual([0, 2]);
  });

  it('selects the latest reading at or before the 15-minute target', () => {
    const readings: MonitoringReading[] = [
      { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1 },
      { timestamp: '2026-10-03T12:07:00.000Z', T1: 9, kWh: 1.5 },
      { timestamp: '2026-10-03T12:12:00.000Z', T1: 8, kWh: 1.75 },
      { timestamp: '2026-10-03T12:25:00.000Z', T1: 6, kWh: 2.75 },
    ];

    expect(computeEfficiencyIndex(readings)[3]).toBeCloseTo(2.4);
  });

  it('returns zero for non-positive kWh deltas and preserves a negative temperature delta', () => {
    const readings: MonitoringReading[] = [
      { timestamp: '2026-10-03T12:00:00.000Z', T1: 10, kWh: 1 },
      { timestamp: '2026-10-03T12:15:00.000Z', T1: 12, kWh: 2 },
      { timestamp: '2026-10-03T12:30:00.000Z', T1: 8, kWh: 2 },
      { timestamp: '2026-10-03T12:45:00.000Z', T1: 6, kWh: 1 },
    ];

    expect(computeEfficiencyIndex(readings)).toEqual([0, -2, 0, 0]);
  });
});
