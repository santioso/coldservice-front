import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdenesServicioComponent } from './ordenes-servicio.component';
import { ComponentsModule } from '../shared/components/components.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@shared';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { OrdenesServicioRoutingModule } from './ordenes-servicio-routing.module';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { FormDialogComponent  as FormDialogDetailsComponent} from './dialogs/form-dialog/form-dialog-details/form-dialog.component';
import { ActivosService } from 'app/activos/activos.service';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';

@NgModule({
  declarations: [
    OrdenesServicioComponent,
    FormDialogComponent,
    FormDialogDetailsComponent,
    DeleteDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ComponentsModule,
    ReactiveFormsModule,

    ComponentsModule,
    SharedModule,
    OrdenesServicioRoutingModule
  ],
  providers: [
    OrdenesServicioService,
    ActivosService
  ],
})
export class OrdenesServicioModule {}
