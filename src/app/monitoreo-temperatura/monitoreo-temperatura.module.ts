import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoreoTemperaturaComponent } from './monitoreo-temperatura.component';
import { MonitoreoTemperaturaRoutingModule } from './monitoreo-temperatura-routing.module';
import { MonitoreoTemperaturaService } from './monitoreo-temperatura.service';
import { ComponentsModule } from '@shared/components/components.module';
import { SharedModule } from '@shared';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgChartsModule } from 'ng2-charts';
import { MatSliderModule } from '@angular/material/slider';

const routes: Routes = [
  {
    path: '',
    component: MonitoreoTemperaturaComponent
  }
];

@NgModule({
  declarations: [
    MonitoreoTemperaturaComponent
  ],
  imports: [
    CommonModule,
    MonitoreoTemperaturaRoutingModule,
    ComponentsModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forChild(routes),
        HttpClientModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        NgChartsModule,
        MatSliderModule
  ],
  providers: [
    MonitoreoTemperaturaService
  ]
})
export class MonitoreoTemperaturaModule { }
