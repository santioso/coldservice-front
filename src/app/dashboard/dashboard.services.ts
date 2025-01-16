import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '../shared/UnsubscribeOnDestroyAdapter';
import { environment } from 'environments/environment';
import { OrderEntryActivitiesDatesModel } from './models/order-entry.model';
import { ActivesByYearAndMonthModel, Chart3StatsModel } from './models/chart3.model';

@Injectable()
export class DashboardService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}`;
  private readonly API_URL_BASICO = `${environment.apiUrl}`;
  isTblLoading = true;
  // Temporarily stores data from dialogs

  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  getOrderEntryActiviesAndDates(): Observable<OrderEntryActivitiesDatesModel> {
    return this.httpClient.get<OrderEntryActivitiesDatesModel>(
      `${this.API_URL}/dashboard/total-entradas-activos`
    );
  }

  getOrdersByYearAndMonth(): Observable<ActivesByYearAndMonthModel> {
    return this.httpClient.get<ActivesByYearAndMonthModel>(
      `${this.API_URL}/dashboard/order-year-month`
    );
  }

  getActiviesByYearAndMonth(): Observable<ActivesByYearAndMonthModel> {
    return this.httpClient.get<ActivesByYearAndMonthModel>(
      `${this.API_URL}/dashboard/assets-year-month`
    );
  }

  getChart3Stats(): Observable<Chart3StatsModel> {
    return this.httpClient.get<Chart3StatsModel>(
      `${this.API_URL}/dashboard/stats-chart3`
    )
  }

  getChartOutputs3Stats(): Observable<Chart3StatsModel> {
    return this.httpClient.get<Chart3StatsModel>(
      `${this.API_URL}/dashboard/statsOutputs-chart3`
    )
  }

  getChart3ActivesStats(): Observable<Chart3StatsModel> {
    return this.httpClient.get<Chart3StatsModel>(
      `${this.API_URL}/dashboard/stats-chart3-actives`
    )
  }

}
