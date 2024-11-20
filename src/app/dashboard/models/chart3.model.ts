export interface SeriesDataModel {
  name: string;
  data: number[];
}

export interface ActivesByYearAndMonthModel {
  series: SeriesDataModel[];
}

export interface Chart3StatsModel {
  totalWeek: number,
  totalMonth: number,
  totalYear: number,
  currentWeek: boolean,
  currentMonth: boolean,
  currentYear: boolean
}
