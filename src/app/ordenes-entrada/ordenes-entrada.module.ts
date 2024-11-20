import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { SharedModule } from '@shared';
import { ComponentsModule } from '@shared/components/components.module';
import { OrdenesEntradaRoutingModule } from './ordenes-entrada-routing.module';
import { OrdenesEntradaComponent } from './ordenes-entrada.component';
import { OrdenesEntradaService } from './ordenes-entrada.service';
import { ActivosService } from 'app/activos/activos.service';

@NgModule({
  declarations: [
    OrdenesEntradaComponent,
    DeleteDialogComponent,
    FormDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OrdenesEntradaRoutingModule,
    ComponentsModule,
    SharedModule,
  ],
  providers: [
    OrdenesEntradaService,
    ActivosService
  ],
})
export class OrdenesEntradaModule { }
