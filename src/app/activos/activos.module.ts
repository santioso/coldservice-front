import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { SharedModule } from '@shared';
import { ComponentsModule } from '@shared/components/components.module';
import { ActivosService } from './activos.service';
import { ActivosRoutingModule } from './activos-routing.module';
import { ActivosComponent } from './activos.component';

@NgModule({
  declarations: [
    ActivosComponent,
    DeleteDialogComponent,
    FormDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ActivosRoutingModule,
    ComponentsModule,
    SharedModule,
  ],
  providers: [ActivosService],
})
export class ActivosModule { }
