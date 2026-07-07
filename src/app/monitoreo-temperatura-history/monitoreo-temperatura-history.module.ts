import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CSVFileService } from './csv-file.service';
import { ComponentsModule } from '@shared/components/components.module';
import { SharedModule } from '@shared';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgChartsModule } from 'ng2-charts';
import { MatSliderModule } from '@angular/material/slider';
import { MonitoreoTemperaturaHistoryRoutingModule } from './monitoreo-temperatura-history-routing.module';
import { MonitoreoTemperaturaHistoryComponent } from './monitoreo-temperatura-history.component';
import { MonitoreoTemperaturaHistoryService } from './monitoreo-temperatura-history.service';

const routes: Routes = [
  {
    path: '',
    component: MonitoreoTemperaturaHistoryComponent,
  },
];

@NgModule({
  declarations: [MonitoreoTemperaturaHistoryComponent],
  imports: [
    CommonModule,
    MonitoreoTemperaturaHistoryRoutingModule,
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
    MatSliderModule,
    MatNativeDateModule,
  ],
  providers: [MonitoreoTemperaturaHistoryService, CSVFileService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class MonitoreoTemperaturaHistoryModule {}
