import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexYAxis,
  ApexPlotOptions,
  ApexStroke,
  ApexLegend,
  ApexFill,
  ApexMarkers,
  ApexGrid,
  ApexTitleSubtitle,
  ApexResponsive,
} from 'ng-apexcharts';
export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  responsive: ApexResponsive[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  colors: string[];
  labels: string[];
  markers: ApexMarkers;
  grid: ApexGrid;
  title: ApexTitleSubtitle;
};
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DashboardService } from '../dashboard.services';
import { OrderEntryActivitiesDatesModel } from '../models/order-entry.model';
import { ActivesByYearAndMonthModel, Chart3StatsModel, SeriesDataModel } from '../models/chart3.model';
@Component({
  selector: 'app-dashboard1',
  templateUrl: './dashboard1.component.html',
  styleUrls: ['./dashboard1.component.scss'],
})
export class Dashboard1Component implements OnInit {
  public areaChartOptions!: Partial<ChartOptions>;
  public barChartOptions!: Partial<ChartOptions>;
  public earningOptions!: Partial<ChartOptions>;
  public earningOptionsActives!: Partial<ChartOptions>;
  public performanceRateChartOptions!: Partial<ChartOptions>;

  dataDashboard!: OrderEntryActivitiesDatesModel;
  totalEntries = 0;
  totalOutputs = 0;
  totalActives = 0;
  chart3Data!: ActivesByYearAndMonthModel;
  chart3Stats!: Chart3StatsModel;
  chart3OutputsStats!: Chart3StatsModel;
  chart3ActivesData!: ActivesByYearAndMonthModel;
  chart3ActivesStats!: Chart3StatsModel;
  seriesOrders: SeriesDataModel[] = [];
  seriesActives: SeriesDataModel[] = [];

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cdr: ChangeDetectorRef
  ) {
    //constructor
  }

  ngOnInit() {
    this.chart1();
    this.chart2();
    this.chart4();
    this.getOrderEntryActiviesAndDates();
    this.getOrdersByYearAndMonth();
    this.getActiviesByYearAndMonth();
  }

  getOrderEntryActiviesAndDates() {
    this.dashboardService.getOrderEntryActiviesAndDates().subscribe({
      next: (data) => {
        this.dataDashboard = data;
        this.totalEntries = this.dataDashboard.totalEntries;
        this.totalOutputs = this.dataDashboard.totalOutputs;
        this.totalActives = this.dataDashboard.totalActives;
      },
      error: (error) => {
        console.error('Error al obtener los datos del dashboard', error);
      },
      // (data: OrderEntryActivitiesDatesModel) => {
        // this.cdr.detectChanges(); // Fuerza una nueva verificación de cambios
      });
  }

  getOrdersByYearAndMonth() {
    this.dashboardService.getOrdersByYearAndMonth().subscribe({
      next: (data: ActivesByYearAndMonthModel) => {
        this.chart3Data = data;
        console.log('this.chart3Data', this.chart3Data)
        this.seriesOrders = this.buildSeriesData(this.chart3Data);
        this.getChart3stats();
        this.getChartOutputs3stats();
        this.chart3Orders();
      },
      error: (error) => {
        console.error('Error al obtener los datos del dashboard', error);
      },
    });
  }

  getActiviesByYearAndMonth() {
    this.dashboardService.getActiviesByYearAndMonth().subscribe({
      next: (data: ActivesByYearAndMonthModel) => {
        this.chart3ActivesData = data;
        this.seriesActives = this.buildSeriesData(this.chart3ActivesData);
        this.getChart3ActivesStats();
        this.chart3Actives();
      },
      error: (error) => {
        console.error('Error al obtener los datos del dashboard', error);
      },
    });
  }

  buildSeriesData(serie: ActivesByYearAndMonthModel): SeriesDataModel[] {
    if (serie?.series) {
      return serie.series.map((item) => ({
        name: item.name,
        data: item.data,
      }));
    }
    return [];
  }

  getChart3stats() {
    this.dashboardService.getChart3Stats().subscribe({
      next: (data) => {
        this.chart3Stats = data;
        console.log('this.chart3Stats', this.chart3Stats)
      },
      error: (error) => {
        console.error('Error al obtener los datos del dashboard', error);
      }
      });
  }

  getChartOutputs3stats() {
    this.dashboardService.getChartOutputs3Stats().subscribe({
      next: (data) => {
        this.chart3OutputsStats = data;
        console.log('this.chart3Stats', this.chart3OutputsStats)
      },
      error: (error) => {
        console.error('Error al obtener los datos del dashboard', error);
      }
      });
  }

  getChart3ActivesStats() {
    this.dashboardService.getChart3ActivesStats().subscribe({
      next: (data) => {
        this.chart3ActivesStats = data;
      },
      error: (error) => {
        console.error('Error al obtener los datos del dashboard', error);
      }
      });
  }

  private chart1() {
    this.areaChartOptions = {
      series: [
        {
          name: 'New Clients',
          data: [31, 40, 28, 51, 42, 85, 77],
        },
        {
          name: 'Old Clients',
          data: [11, 32, 45, 32, 34, 52, 41],
        },
      ],
      chart: {
        height: 350,
        type: 'area',
        toolbar: {
          show: false,
        },
        foreColor: '#9aa0ac',
      },
      colors: ['#4FC3F7', '#7460EE'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
      },
      grid: {
        show: true,
        borderColor: '#9aa0ac',
        strokeDashArray: 1,
      },
      xaxis: {
        type: 'datetime',
        categories: [
          '2018-09-19',
          '2018-09-20',
          '2018-09-21',
          '2018-09-22',
          '2018-09-23',
          '2018-09-24',
          '2018-09-25',
        ],
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
      },

      tooltip: {
        theme: 'dark',
        marker: {
          show: true,
        },
        x: {
          show: true,
        },
      },
    };
  }
  private chart2() {
    this.barChartOptions = {
      series: [
        {
          name: 'New Errors',
          data: [44, 55, 41, 67, 22, 43],
        },
        {
          name: 'Bugs',
          data: [13, 23, 20, 8, 13, 27],
        },
        {
          name: 'Development',
          data: [11, 17, 15, 15, 21, 14],
        },
        {
          name: 'Payment',
          data: [21, 7, 25, 13, 22, 8],
        },
      ],
      chart: {
        type: 'bar',
        height: 350,
        foreColor: '#9aa0ac',
        stacked: true,
        toolbar: {
          show: false,
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            legend: {
              position: 'bottom',
              offsetX: -10,
              offsetY: 0,
            },
          },
        },
      ],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '30%',
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        type: 'category',
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      },
      legend: {
        show: false,
      },
      grid: {
        show: true,
        borderColor: '#9aa0ac',
        strokeDashArray: 1,
      },
      fill: {
        opacity: 0.8,
        colors: ['#E82742', '#2F3149', '#929DB0', '#CED6D3'],
      },
      tooltip: {
        theme: 'dark',
        marker: {
          show: true,
        },
        x: {
          show: true,
        },
      },
    };
  }

  private chart3Orders() {
    this.earningOptions = {
      series: this.seriesOrders,
      chart: {
        height: 240,
        type: 'line',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 3,
        curve: 'smooth',
        dashArray: [0, 8],
      },
      colors: ['#8793ea', '#4caf50'],
      fill: {
        opacity: [1, 0.5],
      },
      markers: {
        size: 0,
        hover: {
          sizeOffset: 6,
        },
      },
      xaxis: {
        categories: [
          'Ene',
          'Feb',
          'Mar',
          'Abr',
          'May',
          'Jun',
          'Jul',
          'Ago',
          'Sep',
          'Oct',
          'Nov',
          'Dic',
        ],
        labels: {
          style: {
            colors: '#8e8da4',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#8e8da4',
          },
        },
      },
      grid: {
        show: true,
        borderColor: '#9aa0ac',
        strokeDashArray: 1,
      },
      tooltip: {
        theme: 'dark',
      },
    };
  }

  private chart3Actives() {
    this.earningOptionsActives = {
      series: this.seriesActives,
      chart: {
        height: 240,
        type: 'line',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 3,
        curve: 'smooth',
        dashArray: [0, 8],
      },
      colors: ['#8793ea', '#4caf50'],
      fill: {
        opacity: [1, 0.5],
      },
      markers: {
        size: 0,
        hover: {
          sizeOffset: 6,
        },
      },
      xaxis: {
        categories: [
          'Ene',
          'Feb',
          'Mar',
          'Abr',
          'May',
          'Jun',
          'Jul',
          'Ago',
          'Sep',
          'Oct',
          'Nov',
          'Dic',
        ],
        labels: {
          style: {
            colors: '#8e8da4',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#8e8da4',
          },
        },
      },
      grid: {
        show: true,
        borderColor: '#9aa0ac',
        strokeDashArray: 1,
      },
      tooltip: {
        theme: 'dark',
      },
    };
  }

  private chart4() {
    this.performanceRateChartOptions = {
      series: [
        {
          name: 'Bill Amount',
          data: [113, 120, 130, 120, 125, 119, 126],
        },
      ],
      chart: {
        height: 380,
        type: 'line',
        dropShadow: {
          enabled: true,
          color: '#000',
          top: 18,
          left: 7,
          blur: 10,
          opacity: 0.2,
        },
        foreColor: '#9aa0ac',
        toolbar: {
          show: false,
        },
      },
      colors: ['#6777EF'],
      dataLabels: {
        enabled: true,
      },
      stroke: {
        curve: 'smooth',
      },
      markers: {
        size: 1,
      },
      xaxis: {
        categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        title: {
          text: 'Weekday',
        },
      },
      yaxis: {
        title: {
          text: 'Bill Amount($)',
        },
      },
      grid: {
        show: true,
        borderColor: '#9aa0ac',
        strokeDashArray: 1,
      },
      tooltip: {
        theme: 'dark',
        marker: {
          show: true,
        },
        x: {
          show: true,
        },
      },
    };
  }

  // TODO start
  tasks = [
    {
      id: '1',
      title: 'Submit Science Homework',
      done: true,
      priority: 'High',
    },
    {
      id: '2',
      title: 'Request for festivle holiday',
      done: false,
      priority: 'High',
    },
    {
      id: '3',
      title: 'Order new java book',
      done: false,
      priority: 'Low',
    },
    {
      id: '4',
      title: 'Remind for lunch in hotel',
      done: true,
      priority: 'Normal',
    },
    {
      id: '5',
      title: 'Pay Hostel Fees',
      done: false,
      priority: 'High',
    },
    {
      id: '6',
      title: 'Attend Seminar On Sunday',
      done: false,
      priority: 'Normal',
    },
    {
      id: '7',
      title: 'Renew bus pass',
      done: true,
      priority: 'High',
    },
    {
      id: '8',
      title: 'Issue book in library',
      done: false,
      priority: 'High',
    },
    {
      id: '9',
      title: 'Project report submit',
      done: false,
      priority: 'Low',
    },
  ];

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.tasks, event.previousIndex, event.currentIndex);
  }

  toggle(task: { done: boolean }) {
    task.done = !task.done;
  }
  // TODO end
}
