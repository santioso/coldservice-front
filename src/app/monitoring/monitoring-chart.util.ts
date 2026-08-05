import { ChartConfiguration, TooltipItem } from 'chart.js';
import { MonitoringReading } from './monitoring.models';

export type ChartSeriesConfig = {
  label: string;
  color: string;
  unit?: string;
  value: (reading: MonitoringReading) => number | undefined;
};

export type MonitoringChartOptions = {
  detailedTimeAxis?: boolean;
  lowerLimit?: number | null;
  upperLimit?: number | null;
  lineTension?: number;
  nonNegativeYAxis?: boolean;
  pointRadius?: number;
  pointHoverRadius?: number;
  yAxisTitle?: string;
};

export function formatTimeLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTimeLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function resolveSeriesUnit(label: string, unit?: string): string {
  if (unit) {
    return unit;
  }

  const normalized = label.trim().toLowerCase();

  if (normalized === 'v' || normalized.includes('voltaje')) {
    return 'V';
  }
  if (normalized === 'a' || normalized.includes('corriente')) {
    return 'A';
  }
  if (normalized === 'w' || normalized.includes('(w)')) {
    return 'W';
  }
  if (normalized === 'wh' || normalized.includes('(wh)')) {
    return 'Wh';
  }
  if (normalized === 'kwh' || normalized.includes('kwh')) {
    return 'kWh';
  }
  if (normalized.includes('δt/kwh') || normalized.includes('dt/kwh')) {
    return '°C/kWh';
  }
  if (
    normalized.includes('delta t') ||
    normalized.includes('evaporación') ||
    normalized.includes('evaporacion') ||
    normalized.includes('condensación') ||
    normalized.includes('condensacion')
  ) {
    return '°C';
  }
  if (
    normalized.includes('gabinete') ||
    normalized.includes('evaporador') ||
    normalized.includes('ambiente') ||
    normalized.includes('condensador') ||
    normalized.includes('temp') ||
    normalized.includes('°c')
  ) {
    return '°C';
  }

  return '';
}

function decimalsForUnit(unit: string): number {
  if (unit === 'kWh') {
    return 5;
  }
  if (unit === 'Wh') {
    return 1;
  }
  if (unit === '°C/kWh') {
    return 2;
  }
  if (unit === 'A') {
    return 2;
  }
  return 1;
}

export function formatChartValue(value: number, unit: string): string {
  if (!Number.isFinite(value)) {
    return '--';
  }

  const formatted = value.toFixed(decimalsForUnit(unit));
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatAxisTick(value: string | number, unit: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }

  return numeric.toFixed(decimalsForUnit(unit));
}

function resolveAxisTitle(unit: string, labels: string[]): string {
  const normalizedLabels = labels.join(' ').toLowerCase();
  if (unit === '°C/kWh') return 'Eficiencia (°C/kWh)';
  if (unit === 'Wh') return 'Consumo (Wh)';
  if (unit === 'kWh') return 'Consumo (kWh)';
  if (unit === 'W') return 'Vatios (W)';
  if (unit === 'A') return 'Corriente (A)';
  if (unit === 'V') return 'Voltaje (V)';
  if (unit === '°C' && normalizedLabels.includes('delta t')) return 'Delta T (°C)';
  if (unit === '°C') return 'Temperatura (°C)';
  return unit;
}

function resolveDatasetColor(color: unknown): string {
  if (typeof color === 'string') {
    return color;
  }
  if (Array.isArray(color)) {
    const first = color.find((value) => typeof value === 'string');
    return typeof first === 'string' ? first : '#666666';
  }
  return '#666666';
}

function buildXScaleOptions(
  labels: string[],
  options: MonitoringChartOptions = {},
) {
  return {
    type: 'category' as const,
    ticks: {
      autoSkip: true,
      maxTicksLimit: options.detailedTimeAxis
        ? Math.min(16, Math.max(labels.length, 1))
        : Math.min(8, Math.max(labels.length, 1)),
      maxRotation: options.detailedTimeAxis ? 45 : 90,
      minRotation: 0,
      callback: (value: string | number) => {
        const index = Number(value);
        if (Number.isInteger(index) && labels[index]) {
          return labels[index];
        }
        return String(value);
      },
    },
  };
}

function buildTooltipOptions(
  readings: MonitoringReading[],
  seriesUnits?: Record<string, string>,
) {
  return {
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    titleColor: '#ffffff',
    bodyColor: '#ffffff',
    footerColor: '#ffffff',
    callbacks: {
      title: (items: TooltipItem<'line'>[]) => {
        const index = items[0]?.dataIndex;
        if (index == null || !readings[index]) {
          return '';
        }
        return formatDateTimeLabel(readings[index].timestamp);
      },
      label: (context: TooltipItem<'line'>) => {
        const label = context.dataset.label ?? 'Valor';
        const unit =
          (label && seriesUnits?.[label]) || resolveSeriesUnit(label);
        const parsedValue = context.parsed.y;

        if (parsedValue == null || !Number.isFinite(parsedValue)) {
          return `${label}: --`;
        }

        return `${label}: ${formatChartValue(parsedValue, unit)}`;
      },
      labelColor: (context: TooltipItem<'line'>) => {
        const color = resolveDatasetColor(context.dataset.borderColor);
        return {
          borderColor: color,
          backgroundColor: color,
        };
      },
    },
  };
}

function buildAxisTickCallback(unit: string) {
  return (
    value: string | number,
    index: number,
    ticks: Array<{ value: string | number }> = [],
  ) => {
    const formatted = formatAxisTick(value, unit);
    const previous = ticks[index - 1];

    if (previous && formatAxisTick(previous.value, unit) === formatted) {
      return '';
    }

    return formatted;
  };
}

function isNonNegativeUnit(unit: string): boolean {
  return ['A', 'V', 'W', 'Wh', 'kWh'].includes(unit);
}

function isGabineteTemperatureSeries(label: string, unit?: string): boolean {
  return label.trim().toLowerCase().includes('gabinete') && resolveSeriesUnit(label, unit) === '°C';
}

export function buildDualAxisChart(
  readings: MonitoringReading[],
  options: MonitoringChartOptions & {
    lowerLimit?: number | null;
    upperLimit?: number | null;
  } = {},
): ChartConfiguration<'line'> {
  const labels = readings.map((item) => formatTimeLabel(item.timestamp));
  const pointRadius = options.pointRadius ?? 0;
  const pointHoverRadius = options.pointHoverRadius ?? 4;
  const tempValues = readings.map((item) =>
    typeof item.T1 === 'number' ? item.T1 : null,
  );
  const tempScaleValues = [
    ...tempValues.filter((value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
    ),
    options.lowerLimit,
    options.upperLimit,
  ].filter((value): value is number =>
    typeof value === 'number' && Number.isFinite(value),
  );
  const tempMin = tempScaleValues.length ? Math.min(...tempScaleValues) : undefined;
  const tempMax = tempScaleValues.length ? Math.max(...tempScaleValues) : undefined;
  const tempRange =
    tempMin != null && tempMax != null ? Math.max(tempMax - tempMin, 1) : undefined;
  const tempPadding = tempRange != null ? Math.max(tempRange * 0.12, 0.5) : undefined;
  const currentValues = readings.map((item) =>
    typeof item.A === 'number' ? item.A : null,
  );
  const tempUnit = '°C';
  const currentUnit = 'A';

  const limitDatasets: ChartConfiguration<'line'>['data']['datasets'] = [];
  if (options.lowerLimit != null) {
    limitDatasets.push({
      label: 'Límite inferior',
      data: Array(readings.length).fill(options.lowerLimit),
      borderColor: '#dc2626',
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
      yAxisID: 'yTemp',
    });
  }
  if (options.upperLimit != null) {
    limitDatasets.push({
      label: 'Límite superior',
      data: Array(readings.length).fill(options.upperLimit),
      borderColor: '#f59e0b',
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
      yAxisID: 'yTemp',
    });
  }

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Gabinete',
          data: tempValues,
          borderColor: '#0057b8',
          backgroundColor: '#0057b8',
          borderWidth: 2,
          yAxisID: 'yTemp',
          pointRadius,
          pointHoverRadius,
          tension: 0.3,
          fill: false,
        },
        {
          label: 'Corriente',
          data: currentValues,
          borderColor: '#ff8f00',
          backgroundColor: '#ff8f00',
          borderWidth: 2,
          yAxisID: 'yCurrent',
          pointRadius,
          pointHoverRadius,
          tension: 0,
          fill: false,
        },
        ...limitDatasets,
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: buildTooltipOptions(readings),
      },
      scales: {
        x: buildXScaleOptions(labels, options),
        yTemp: {
          type: 'linear',
          position: 'left',
          min: tempMin != null && tempPadding != null ? tempMin - tempPadding : undefined,
          max: tempMax != null && tempPadding != null ? tempMax + tempPadding : undefined,
          title: { display: true, text: resolveAxisTitle(tempUnit, ['Gabinete']) },
          ticks: { callback: buildAxisTickCallback(tempUnit) },
        },
        yCurrent: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          min: 0,
          grid: { drawOnChartArea: false },
          title: { display: true, text: resolveAxisTitle(currentUnit, ['Corriente']) },
          ticks: { callback: buildAxisTickCallback(currentUnit) },
        },
      },
    },
  };
}

export function buildMultiSeriesChart(
  readings: MonitoringReading[],
  series: ChartSeriesConfig[],
  options: MonitoringChartOptions = {},
): ChartConfiguration<'line'> {
  const labels = readings.map((item) => formatTimeLabel(item.timestamp));
  const pointRadius = options.pointRadius ?? 0;
  const pointHoverRadius = options.pointHoverRadius ?? 4;
  const units = series.map((item) =>
    resolveSeriesUnit(item.label, item.unit),
  );
  const seriesUnits = Object.fromEntries(
    series.map((item) => [
      item.label,
      resolveSeriesUnit(item.label, item.unit),
    ]),
  );
  const sharedUnit =
    units.length > 0 && units.every((unit) => unit === units[0])
      ? units[0]
      : '';
  const nonNegativeYAxis =
    options.nonNegativeYAxis ||
    (units.length > 0 && units.every((unit) => isNonNegativeUnit(unit)));

  const limitDatasets: ChartConfiguration<'line'>['data']['datasets'] = [];
  if (options.lowerLimit != null) {
    limitDatasets.push({
      label: 'Límite inferior',
      data: Array(readings.length).fill(options.lowerLimit),
      borderColor: '#dc2626',
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
    });
  }
  if (options.upperLimit != null) {
    limitDatasets.push({
      label: 'Límite superior',
      data: Array(readings.length).fill(options.upperLimit),
      borderColor: '#f59e0b',
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
    });
  }

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        ...series.map((item) => ({
          label: item.label,
          data: readings.map((reading) => {
            const value = item.value(reading);
            return typeof value === 'number' ? value : null;
          }),
          borderColor: item.color,
          backgroundColor: item.color,
          borderWidth: 2,
          pointRadius,
          pointHoverRadius,
          tension: options.lineTension ??
            (isGabineteTemperatureSeries(item.label, item.unit) ? 0.3 : 0),
          fill: false,
        })),
        ...limitDatasets,
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: buildTooltipOptions(readings, seriesUnits),
      },
      scales: {
        x: buildXScaleOptions(labels, options),
        y: {
          beginAtZero: nonNegativeYAxis,
          min: nonNegativeYAxis ? 0 : undefined,
          title: sharedUnit || options.yAxisTitle
            ? {
                display: true,
                text: sharedUnit
                  ? resolveAxisTitle(sharedUnit, series.map((item) => item.label))
                  : options.yAxisTitle,
              }
            : { display: false },
          ticks: sharedUnit
            ? {
                callback: buildAxisTickCallback(sharedUnit),
                maxTicksLimit: sharedUnit === 'kWh' ? 6 : undefined,
              }
            : undefined,
        },
      },
    },
  };
}

export function computeEfficiencyIndex(readings: MonitoringReading[]): number[] {
  if (!readings.length) return [];
  const initial = readings[0].T1 ?? 0;
  return readings.map((reading) => {
    const current = reading.T1 ?? 0;
    const kwh = Math.max(0, reading.kWh ?? 0);
    const delta = initial - current;
    if (delta <= 0 || kwh <= 0) return 0;
    return delta / kwh;
  });
}

export function computeDeltaTEvap(reading: MonitoringReading): number {
  return (reading.T1 ?? 0) - (reading.T2 ?? 0);
}

export function computeDeltaTCond(reading: MonitoringReading): number {
  return (reading.T4 ?? 0) - (reading.T3 ?? 0);
}

export function computePower(reading: MonitoringReading): number {
  const v = reading.V ?? 0;
  const a = reading.A ?? 0;
  const fp = Math.max(0, Math.min(reading.FP ?? 1, 1));
  return v * a * fp;
}
