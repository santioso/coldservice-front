import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MonitoreoTemperaturaComponent } from './monitoreo-temperatura.component';

const routes: Routes = [
  { path: '', component: MonitoreoTemperaturaComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class MonitoreoTemperaturaRoutingModule {}
