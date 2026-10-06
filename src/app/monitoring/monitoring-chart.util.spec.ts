import {
  buildDualAxisChart,
  buildMultiSeriesChart,
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
