import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MonitoringAuthGuard } from './monitoring-auth.guard';
import { MonitoringDashboardComponent } from './monitoring-dashboard/monitoring-dashboard.component';
import { MonitoringDeviceDetailComponent } from './monitoring-device-detail/monitoring-device-detail.component';
import { MonitoringLoginComponent } from './monitoring-login/monitoring-login.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: MonitoringLoginComponent },
  {
    path: 'dashboard',
    component: MonitoringDashboardComponent,
    canActivate: [MonitoringAuthGuard],
  },
  {
    path: 'devices/:deviceId',
    component: MonitoringDeviceDetailComponent,
    canActivate: [MonitoringAuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MonitoringRoutingModule {}
