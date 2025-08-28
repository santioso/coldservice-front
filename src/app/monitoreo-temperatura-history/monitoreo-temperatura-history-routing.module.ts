import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MonitoreoTemperaturaHistoryComponent } from './monitoreo-temperatura-history.component';

const routes: Routes = [
  {
    path: '',
    component: MonitoreoTemperaturaHistoryComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MonitoreoTemperaturaHistoryRoutingModule { }
