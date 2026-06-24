import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { SharedModule } from '@shared';
import { MonitoringDashboardComponent } from './monitoring-dashboard/monitoring-dashboard.component';
import { MonitoringDeviceDetailComponent } from './monitoring-device-detail/monitoring-device-detail.component';
import { MonitoringLoginComponent } from './monitoring-login/monitoring-login.component';
import { MonitoringZoomChartDialogComponent } from './monitoring-zoom-chart-dialog.component';
import { MonitoringRoutingModule } from './monitoring-routing.module';

@NgModule({
  declarations: [
    MonitoringLoginComponent,
    MonitoringDashboardComponent,
    MonitoringDeviceDetailComponent,
    MonitoringZoomChartDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    MonitoringRoutingModule,
    NgChartsModule,
  ],
})
export class MonitoringModule {}
