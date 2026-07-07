import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SharedModule } from '@shared';
import { MonitoringDashboardComponent } from './monitoring-dashboard/monitoring-dashboard.component';
import { MonitoringDeviceDetailComponent } from './monitoring-device-detail/monitoring-device-detail.component';
import { MonitoringHistoricosComponent } from './monitoring-historicos/monitoring-historicos.component';
import { MonitoringLoginComponent } from './monitoring-login/monitoring-login.component';
import { MonitoringZoomChartDialogComponent } from './monitoring-zoom-chart-dialog.component';
import { MonitoringActivoDialogComponent } from './monitoring-activo-dialog.component';
import { MonitoringClienteDialogComponent } from './monitoring-cliente-dialog.component';
import { MonitoringTecnicoDialogComponent } from './monitoring-tecnico-dialog.component';
import { MonitoringConfirmDialogComponent } from './monitoring-confirm-dialog.component';
import { MonitoringRoutingModule } from './monitoring-routing.module';

@NgModule({
  declarations: [
    MonitoringLoginComponent,
    MonitoringDashboardComponent,
    MonitoringDeviceDetailComponent,
    MonitoringHistoricosComponent,
    MonitoringZoomChartDialogComponent,
    MonitoringActivoDialogComponent,
    MonitoringClienteDialogComponent,
    MonitoringTecnicoDialogComponent,
    MonitoringConfirmDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    MonitoringRoutingModule,
    NgChartsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatListModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
})
export class MonitoringModule {}
